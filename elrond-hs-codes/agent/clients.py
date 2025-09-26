from __future__ import annotations
import os
import json
import time
import uuid
import asyncio
import threading
import base64
import logging
from datetime import datetime
from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Tuple
import sys
from pathlib import Path

# Import session tracer
sys.path.insert(0, str(Path(__file__).parent.parent))
try:
    from session_tracer import get_tracer, trace_session_creation, trace_session_reuse, trace_api_call, trace_conversation_history
    TRACER_AVAILABLE = True
except ImportError:
    print("Session tracer not available - running without session tracking")
    TRACER_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class ChatMessage:
    role: str  # "user" or "agent"
    content: str


class ChatBackend:
    def start_session(self) -> str:
        raise NotImplementedError

    def send(self, session_id: str, message: ChatMessage) -> ChatMessage:
        raise NotImplementedError

    def end_session(self, session_id: str) -> None:
        raise NotImplementedError


class MockChatClient(ChatBackend):
    def __init__(self) -> None:
        self._sessions: Dict[str, list[ChatMessage]] = {}
        self._counter = 0

    def start_session(self) -> str:
        self._counter += 1
        sid = f"mock-session-{self._counter}"
        self._sessions[sid] = []
        return sid

    def send(self, session_id: str, message: ChatMessage) -> ChatMessage:
        history = self._sessions.get(session_id)
        if history is None:
            raise RuntimeError("Unknown session_id")
        history.append(message)
        reply_text = (
            "I received: " + message.content[:300]
            + "\n(When connected to ElevenLabs, this will be the real agent's reply.)"
        )
        reply = ChatMessage(role="agent", content=reply_text)
        history.append(reply)
        return reply

    def end_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


class ElevenLabsChatClient(ChatBackend):
    """
    ElevenLabs agent text chat using conversation simulation API.
    Uses the /v1/convai/agents/{agent_id}/simulate-conversation endpoint.

    Environment:
      ELEVENLABS_API_KEY (required)
      ELEVENLABS_AGENT_ID (required)
      ELEVENLABS_BASE_URL (optional, default https://api.elevenlabs.io)
    """

    def __init__(self, api_key: Optional[str] = None, agent_id: Optional[str] = None, base_url: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.agent_id = agent_id or os.getenv("ELEVENLABS_AGENT_ID")
        self.base_url = (base_url or os.getenv("ELEVENLABS_BASE_URL") or "https://api.elevenlabs.io").rstrip("/")
        if not self.api_key or not self.agent_id:
            raise RuntimeError("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID in environment.")
        try:
            import requests  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError("requests not installed. Run: pip install requests") from e
        self._requests = requests
        self._conversation_history: List[Dict[str, str]] = []

    def start_session(self) -> str:
        # Only reset conversation history if this is truly a new session
        # Generate unique session ID using timestamp
        import time
        session_timestamp = int(time.time() * 1000)  # milliseconds since epoch
        session_id = f"elevenlabs-session-{session_timestamp}"

        # Only reset history if we're starting fresh (no existing history)
        if not hasattr(self, '_current_session_id') or self._current_session_id is None:
            self._conversation_history = []
            self._current_session_id = session_id
        else:
            # Reusing existing session - don't reset history
            session_id = self._current_session_id

        # Trace session creation
        if TRACER_AVAILABLE:
            trace_session_creation(session_id, {
                "conversation_history_length": len(self._conversation_history),
                "agent_id": self.agent_id,
                "base_url": self.base_url
            })

        logger.info(f"[SESSION] Created session: {session_id} (history length: {len(self._conversation_history)})")
        return session_id

    def _post_json(self, url: str, json_body: Dict[str, Any]) -> Any:
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        resp = self._requests.post(url, headers=headers, json=json_body, timeout=60)
        # Raise with readable server text
        try:
            resp.raise_for_status()
        except Exception as e:
            body = None
            try:
                body = resp.text
            except Exception:
                pass
            raise RuntimeError(f"ElevenLabs API error {resp.status_code} at {url}: {body}") from e
        try:
            return resp.json()
        except Exception:
            return resp.text

    def send(self, session_id: str, message: ChatMessage) -> ChatMessage:
        # Trace session reuse
        if TRACER_AVAILABLE:
            trace_session_reuse(session_id, message.content)

        logger.info(f"[SESSION] Using session: {session_id} for message: {message.content[:50]}...")
        logger.info(f"[SESSION] Conversation history before: {len(self._conversation_history)} turns")

        # Add user message to conversation history
        self._conversation_history.append({
            "role": "user",
            "content": message.content
        })

        # Log conversation history state
        if TRACER_AVAILABLE:
            trace_conversation_history(session_id, self._conversation_history)

        logger.info(f"[SESSION] Conversation history after adding user message: {len(self._conversation_history)} turns")

        # Use the simulate conversation endpoint
        url = f"{self.base_url}/v1/convai/agents/{self.agent_id}/simulate-conversation"

        # Create conversation context with history, but format it properly for the API
        # The API expects the conversation history to be in a specific format
        conversation_context = " ".join([
            f"{'User' if turn['role'] == 'user' else 'Agent'}: {turn['content']}"
            for turn in self._conversation_history[:-1]  # Exclude the current message
        ]) if len(self._conversation_history) > 1 else ""

        payload = {
            "simulation_specification": {
                "simulated_user_config": {
                    # Send the latest user message as the context
                    "user_message": message.content,
                    # Include conversation context if there's history
                    "conversation_context": conversation_context
                }
            },
            "new_turns_limit": 1  # Only generate one new turn from the agent
        }

        logger.info(f"[SESSION] Context length being sent: {len(conversation_context)} chars")
        logger.info(f"[SESSION] Context preview: {conversation_context[:200]}...")

        # Trace API call
        if TRACER_AVAILABLE:
            trace_api_call(session_id, payload)

        try:
            data = self._post_json(url, payload)
            reply_text: Optional[str] = None

            if isinstance(data, dict):
                # Look for simulated conversation in response
                simulated_conv = data.get("simulated_conversation")
                if isinstance(simulated_conv, list) and simulated_conv:
                    # Get the last agent response (check both 'speaker' and 'role' fields)
                    for turn in reversed(simulated_conv):
                        if isinstance(turn, dict):
                            turn_role = turn.get("speaker") or turn.get("role")
                            if turn_role == "agent":
                                reply_text = turn.get("message")
                                if reply_text:
                                    break

                # Fallback to other response fields
                if not reply_text:
                    for key in ("response", "reply", "text", "message", "output"):
                        val = data.get(key)
                        if isinstance(val, str) and val.strip():
                            reply_text = val
                            break

            if not reply_text:
                reply_text = "I'm sorry, I couldn't generate a proper response."

            # Add agent response to history
            self._conversation_history.append({
                "role": "agent",
                "content": reply_text
            })

            return ChatMessage(role="agent", content=reply_text)

        except Exception as e:
            # Fallback response if API fails
            fallback_response = f"ElevenLabs API unavailable: {str(e)[:100]}. Using mock response for testing."
            return ChatMessage(role="agent", content=fallback_response)

    def end_session(self, session_id: str) -> None:
        self._conversation_history = []


class ElevenLabsWebSocketClient(ChatBackend):
    """
    ElevenLabs agent text chat using WebSocket API for live conversations.
    Uses the wss://api.elevenlabs.io/v1/convai/conversation WebSocket endpoint.

    Environment:
      ELEVENLABS_API_KEY (required)
      ELEVENLABS_AGENT_ID (required)
      ELEVENLABS_BASE_URL (optional, default https://api.elevenlabs.io)
    """

    def __init__(self, api_key: Optional[str] = None, agent_id: Optional[str] = None, base_url: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.agent_id = agent_id or os.getenv("ELEVENLABS_AGENT_ID")
        self.base_url = (base_url or os.getenv("ELEVENLABS_BASE_URL") or "https://api.elevenlabs.io").rstrip("/")
        if not self.api_key or not self.agent_id:
            raise RuntimeError("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID in environment.")

        try:
            import websockets  # type: ignore
            import requests  # type: ignore
        except ImportError as e:  # pragma: no cover
            raise RuntimeError("websockets and requests not installed. Run: pip install websockets requests") from e

        self.websockets = websockets
        self.requests = requests
        self.websocket = None
        self.response_queue = asyncio.Queue()
        self.websocket_task = None
        self.loop = None
        self.audio_stats = {
            "total_audio_events": 0,
            "total_audio_bytes": 0,
            "decode_errors": 0,
            "last_audio_timestamp": None
        }

    def _get_signed_url(self) -> str:
        """Get a signed URL for WebSocket connection"""
        url = f"{self.base_url}/v1/convai/conversation/get-signed-url"
        headers = {"xi-api-key": self.api_key}
        params = {"agent_id": self.agent_id}

        resp = self.requests.get(url, headers=headers, params=params, timeout=30)
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to get signed URL: {resp.status_code} {resp.text}")

        data = resp.json()
        return data.get("signed_url") or f"wss://api.elevenlabs.io/v1/convai/conversation?agent_id={self.agent_id}"

    def _validate_audio_data(self, audio_base64: str) -> Dict[str, Any]:
        """Validate and analyze base64 audio data"""
        validation_result = {
            "valid": False,
            "error": None,
            "size_bytes": 0,
            "format_info": {}
        }

        try:
            # Decode base64
            audio_bytes = base64.b64decode(audio_base64)
            validation_result["size_bytes"] = len(audio_bytes)

            logger.debug(f"[AUDIO-VALIDATION] Decoded {len(audio_bytes)} bytes from base64")

            # Basic PCM validation - check if data looks reasonable
            if len(audio_bytes) < 16:
                validation_result["error"] = "Audio data too short"
                return validation_result

            # For PCM 16-bit, expect even number of bytes
            if len(audio_bytes) % 2 != 0:
                logger.warning(f"[AUDIO-VALIDATION] Odd number of bytes ({len(audio_bytes)}), may not be PCM 16-bit")

            # Basic sanity check - look at first few samples
            if len(audio_bytes) >= 4:
                sample1 = int.from_bytes(audio_bytes[0:2], byteorder='little', signed=True)
                sample2 = int.from_bytes(audio_bytes[2:4], byteorder='little', signed=True)
                logger.debug(f"[AUDIO-VALIDATION] First samples: {sample1}, {sample2}")

            validation_result["valid"] = True
            validation_result["format_info"] = {
                "assumed_format": "PCM 16-bit",
                "sample_count_estimate": len(audio_bytes) // 2,
                "duration_estimate_ms": (len(audio_bytes) // 2) / 16  # Rough estimate for 16kHz
            }

        except Exception as e:
            validation_result["error"] = str(e)
            logger.error(f"[AUDIO-VALIDATION] Error: {e}")

        return validation_result

    def _process_audio_event(self, audio_data: Dict[str, Any]) -> Optional[str]:
        """Process audio event and extract any text/transcript if available"""
        try:
            self.audio_stats["total_audio_events"] += 1
            self.audio_stats["last_audio_timestamp"] = datetime.now().isoformat()

            audio_base64 = audio_data.get("audio_base_64")
            if not audio_base64:
                logger.warning("[AUDIO-PROCESSING] No audio_base_64 in audio event")
                return None

            logger.info(f"[AUDIO-PROCESSING] Processing audio event #{self.audio_stats['total_audio_events']}")

            # Validate audio data
            validation = self._validate_audio_data(audio_base64)
            if validation["valid"]:
                self.audio_stats["total_audio_bytes"] += validation["size_bytes"]
                logger.info(f"[AUDIO-PROCESSING] Valid audio: {validation['size_bytes']} bytes")
                logger.debug(f"[AUDIO-PROCESSING] Format info: {validation['format_info']}")

                # TODO: Implement actual audio-to-text conversion
                # For now, we'll return None to indicate no text was extracted
                logger.warning("[AUDIO-PROCESSING] Audio-to-text conversion not implemented yet")
                return None
            else:
                self.audio_stats["decode_errors"] += 1
                logger.error(f"[AUDIO-PROCESSING] Invalid audio: {validation['error']}")
                return None

        except Exception as e:
            logger.error(f"[AUDIO-PROCESSING] Error processing audio event: {e}")
            return None

    async def _websocket_handler(self, websocket_url: str):
        """Handle WebSocket connection and messages"""
        try:
            logger.info(f"[WEBSOCKET] Connecting to: {websocket_url}")
            # Import ssl for certificate handling
            import ssl

            # Create SSL context that can handle certificates
            ssl_context = ssl.create_default_context()
            # For development/testing, disable certificate verification temporarily
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            async with self.websockets.connect(websocket_url, ssl=ssl_context) as websocket:
                logger.info("[WEBSOCKET] Connection established successfully")
                self.websocket = websocket

                # Send initial conversation config (text-only mode)
                init_message = {
                    "conversation_config_override": {
                        "conversation": {
                            "text_only": True
                        }
                    }
                }
                logger.info(f"[WEBSOCKET] Sending init message: {json.dumps(init_message)}")
                await websocket.send(json.dumps(init_message))

                # Signal that connection is ready
                await self.response_queue.put({"type": "connected"})

                # Listen for messages
                async for message in websocket:
                    try:
                        # Log message with timestamp and truncate if too long
                        timestamp = datetime.now().isoformat()
                        message_preview = message[:200] + "..." if len(message) > 200 else message
                        logger.info(f"[WEBSOCKET-IN] {timestamp}: {message_preview}")

                        data = json.loads(message)
                        await self._handle_websocket_message(data)
                    except json.JSONDecodeError as e:
                        logger.error(f"[WEBSOCKET] Failed to parse JSON: {e}")
                        logger.debug(f"[WEBSOCKET] Raw message: {message}")
                        continue
                    except Exception as e:
                        logger.error(f"[WEBSOCKET] Error handling message: {e}")
                        logger.debug(f"[WEBSOCKET] Message that caused error: {message}")

        except Exception as e:
            logger.error(f"[WEBSOCKET] Handler error: {e}")
            await self.response_queue.put({"error": str(e)})

    async def _handle_websocket_message(self, data: Dict[str, Any]):
        """Handle incoming WebSocket messages with comprehensive logging"""
        message_type = data.get("type")
        timestamp = datetime.now().isoformat()

        logger.info(f"[MESSAGE-HANDLER] {timestamp}: Processing message type '{message_type}'")
        logger.debug(f"[MESSAGE-HANDLER] Full message data: {json.dumps(data, indent=2)}")

        if message_type == "conversation_initiation_metadata":
            # Connection established
            logger.info("[MESSAGE-HANDLER] Conversation initiated successfully")
            conversation_id = data.get("conversation_initiation_metadata_event", {}).get("conversation_id")
            if conversation_id:
                logger.info(f"[MESSAGE-HANDLER] Conversation ID: {conversation_id}")
            await self.response_queue.put({"type": "connected"})

        elif message_type == "agent_response":
            # Agent sent a text response
            text = data.get("text", "")
            logger.info(f"[MESSAGE-HANDLER] Agent response text: {text}")
            if text:
                await self.response_queue.put({"type": "response", "text": text})
            else:
                logger.warning("[MESSAGE-HANDLER] Agent response received but no text content")

        elif message_type == "audio_event":
            # Handle audio events properly - this is likely where the issue is
            logger.info("[MESSAGE-HANDLER] Received audio_event")
            audio_data = data.get("audio_event", {})

            if audio_data:
                # Process the audio event using our helper method
                try:
                    transcript_text = self._process_audio_event(audio_data)
                    if transcript_text:
                        # If we extracted text from audio, treat it as a user message
                        logger.info(f"[MESSAGE-HANDLER] Extracted text from audio: {transcript_text}")
                        await self.response_queue.put({"type": "user_transcript", "text": transcript_text})
                    else:
                        # Audio processed but no text extracted
                        logger.info("[MESSAGE-HANDLER] Audio processed but no text extracted")

                    # Log audio statistics periodically
                    if self.audio_stats["total_audio_events"] % 10 == 0:
                        logger.info(f"[AUDIO-STATS] Events: {self.audio_stats['total_audio_events']}, "
                                  f"Bytes: {self.audio_stats['total_audio_bytes']}, "
                                  f"Errors: {self.audio_stats['decode_errors']}")

                except Exception as e:
                    logger.error(f"[MESSAGE-HANDLER] Error processing audio event: {e}")
            else:
                logger.warning("[MESSAGE-HANDLER] Audio event received but no audio_event data")

        elif message_type == "user_transcript":
            # User transcript received
            transcript = data.get("text", "")
            logger.info(f"[MESSAGE-HANDLER] User transcript: {transcript}")

        elif message_type == "agent_response_event":
            # Different format for agent responses
            text = data.get("text", "")
            logger.info(f"[MESSAGE-HANDLER] Agent response event text: {text}")
            if text:
                await self.response_queue.put({"type": "response", "text": text})
            else:
                logger.warning("[MESSAGE-HANDLER] Agent response event received but no text content")

        else:
            # Log unhandled message types for debugging
            logger.warning(f"[MESSAGE-HANDLER] Unhandled message type: {message_type}")
            logger.debug(f"[MESSAGE-HANDLER] Unhandled message data: {json.dumps(data, indent=2)}")

    def _run_websocket(self, websocket_url: str):
        """Run WebSocket in a separate thread"""
        try:
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._websocket_handler(websocket_url))
        except Exception as e:
            print(f"WebSocket thread error: {e}")

    def start_session(self) -> str:
        session_id = f"elevenlabs-ws-{uuid.uuid4().hex[:8]}"

        try:
            # Get signed URL for connection
            websocket_url = self._get_signed_url()

            # Start WebSocket in background thread
            self.websocket_task = threading.Thread(
                target=self._run_websocket,
                args=(websocket_url,),
                daemon=True
            )
            self.websocket_task.start()

            # Wait for connection to be established
            print("Waiting for WebSocket connection to establish...")
            start_time = time.time()
            while time.time() - start_time < 10:  # 10 second timeout
                try:
                    if self.loop:
                        # Check if we received the connected event
                        future = asyncio.run_coroutine_threadsafe(
                            asyncio.wait_for(self.response_queue.get(), timeout=1.0),
                            self.loop
                        )
                        response = future.result(timeout=2.0)
                        if response.get("type") == "connected":
                            print("WebSocket connected successfully!")
                            break
                        else:
                            # Put non-connection messages back in queue
                            asyncio.run_coroutine_threadsafe(
                                self.response_queue.put(response),
                                self.loop
                            )
                except:
                    time.sleep(0.5)
                    continue

            return session_id

        except Exception as e:
            raise RuntimeError(f"Failed to start WebSocket session: {e}")

    def send(self, session_id: str, message: ChatMessage) -> ChatMessage:
        timestamp = datetime.now().isoformat()
        logger.info(f"[SEND] {timestamp}: Sending message: '{message.content[:100]}{'...' if len(message.content) > 100 else ''}'")

        if not self.websocket or not self.loop:
            error_msg = "WebSocket connection not available. Please restart the session."
            logger.error(f"[SEND] {error_msg}")
            return ChatMessage(role="agent", content=error_msg)

        try:
            # Send user message via WebSocket
            user_message = {
                "type": "user_message",
                "text": message.content
            }

            logger.debug(f"[SEND] Sending WebSocket message: {json.dumps(user_message)}")

            # Send message in the WebSocket thread
            send_future = asyncio.run_coroutine_threadsafe(
                self.websocket.send(json.dumps(user_message)),
                self.loop
            )

            try:
                send_future.result(timeout=5.0)
                logger.info("[SEND] Message sent successfully via WebSocket")
            except asyncio.TimeoutError:
                logger.error("[SEND] Timeout sending message via WebSocket")
                return ChatMessage(role="agent", content="Timeout sending message to agent.")
            except Exception as e:
                logger.error(f"[SEND] Error sending message via WebSocket: {e}")
                return ChatMessage(role="agent", content=f"Error sending message: {str(e)}")

            # Wait for agent response
            logger.info("[SEND] Waiting for agent response...")
            response_future = asyncio.run_coroutine_threadsafe(
                self.response_queue.get(),
                self.loop
            )

            try:
                response_data = response_future.result(timeout=15.0)  # Increased timeout for agent processing
                logger.info(f"[SEND] Received response: {response_data}")
            except asyncio.TimeoutError:
                logger.error("[SEND] Timeout waiting for agent response")
                return ChatMessage(role="agent", content="Timeout waiting for agent response.")
            except Exception as e:
                logger.error(f"[SEND] Error waiting for agent response: {e}")
                return ChatMessage(role="agent", content=f"Error waiting for response: {str(e)}")

            # Process the response
            if response_data.get("type") == "response":
                response_text = response_data["text"]
                logger.info(f"[SEND] Agent responded: '{response_text[:100]}{'...' if len(response_text) > 100 else ''}'")
                return ChatMessage(role="agent", content=response_text)
            elif response_data.get("type") == "user_transcript":
                # We received a transcript, which means audio was processed
                # But we still need to wait for the agent's actual response
                logger.info(f"[SEND] Received transcript: {response_data.get('text', '')}")
                # Try to get the actual response
                try:
                    response_future2 = asyncio.run_coroutine_threadsafe(
                        self.response_queue.get(),
                        self.loop
                    )
                    response_data2 = response_future2.result(timeout=10.0)
                    if response_data2.get("type") == "response":
                        return ChatMessage(role="agent", content=response_data2["text"])
                except:
                    pass
                return ChatMessage(role="agent", content="Received transcript but no agent response.")
            elif "error" in response_data:
                error_msg = f"WebSocket error: {response_data['error']}"
                logger.error(f"[SEND] {error_msg}")
                return ChatMessage(role="agent", content=error_msg)
            else:
                logger.warning(f"[SEND] Unexpected response type: {response_data.get('type')}")
                return ChatMessage(role="agent", content="Unexpected response format from agent.")

        except Exception as e:
            error_msg = f"Communication error: {str(e)}"
            logger.error(f"[SEND] {error_msg}")
            return ChatMessage(role="agent", content=error_msg)

    def end_session(self, session_id: str) -> None:
        if self.websocket and self.loop:
            try:
                # Close WebSocket connection
                future = asyncio.run_coroutine_threadsafe(
                    self.websocket.close(),
                    self.loop
                )
                future.result(timeout=2.0)
            except Exception:
                pass

        if self.websocket_task and self.websocket_task.is_alive():
            # Note: We can't force-kill daemon threads, they'll exit when main program exits
            pass

        self.websocket = None
        self.loop = None
