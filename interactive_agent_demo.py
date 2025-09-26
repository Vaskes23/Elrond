#!/usr/bin/env python3
"""
Interactive ElevenLabs Agent - Wait for Real User Responses
Modified to prevent agent from answering itself
"""

import os
import ssl
import certifi
import json
from datetime import datetime
from pathlib import Path

# Fix SSL certificate verification
ssl_context = ssl.create_default_context(cafile=certifi.where())
ssl._create_default_https_context = lambda: ssl_context

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
    root_env = Path(__file__).resolve().parent / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)
except ImportError:
    pass

from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation, ConversationInitiationData
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface

def main():
    """Agent that waits for real user responses without self-answering"""

    print("🎤 Interactive ElevenLabs Agent - With Transcript Storage")
    print("=" * 60)

    # Setup transcript storage
    session_id = f"elevenlabs-session-{int(datetime.now().timestamp() * 1000)}"
    timestamp_str = datetime.now().strftime("%Y%m%d-%H%M%S")
    transcript_file = Path("transcripts") / f"session-{timestamp_str}.json"

    # Ensure transcripts directory exists
    transcript_file.parent.mkdir(exist_ok=True)

    print(f"📝 Transcript will be saved to: {transcript_file}")

    # Initialize transcript storage
    conversation_history = []

    # Get credentials
    agent_id = os.getenv("ELEVENLABS_AGENT_ID")
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if not agent_id or not api_key:
        print("❌ Missing ELEVENLABS_AGENT_ID or ELEVENLABS_API_KEY")
        return

    print(f"🎯 Agent ID: {agent_id}")
    print(f"🔑 API Key: {'*' * 20}...{api_key[-4:]}")

    # Initialize client
    try:
        elevenlabs = ElevenLabs(api_key=api_key)
        print("✅ Client initialized")
    except Exception as e:
        print(f"❌ Client initialization failed: {e}")
        return

    # Setup callbacks with transcript storage
    def save_transcript_entry(speaker, text):
        """Save a transcript entry to file"""
        entry = {
            "call_id": session_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "text": f"{speaker}: {text}"
        }
        conversation_history.append(entry)

        # Append to file immediately
        with open(transcript_file, 'a') as f:
            f.write(json.dumps(entry) + '\n')

    def on_agent_response(response):
        print(f"🤖 Agent: {response}")
        save_transcript_entry("Agent", response)

    def on_user_transcript(transcript):
        print(f"👤 User: {transcript}")
        save_transcript_entry("User", transcript)

    # Create conversation with settings to prevent self-answering
    try:
        user_id = "customs-officer-real"

        # Configuration to make agent more interactive
        config = ConversationInitiationData(
            conversation_config_override={
                "agent_config": {
                    "conversational_config": {
                        "user_silence_timeout_ms": 12000,     # 12 seconds of silence before agent responds
                        "response_timeout_ms": 20000,         # 20 seconds max wait for user response
                        "interruption_threshold": 0.8,        # Very high threshold = very hard to interrupt
                        "silence_threshold": 0.2,             # Lower = more sensitive to silence
                        "enable_backchannel": False,          # Disable automatic responses
                        "turn_detection": {
                            "type": "server_vad",              # Server-side voice activity detection
                            "threshold": 0.5,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 800         # Longer silence before considering turn ended
                        }
                    }
                },
                "conversation_config": {
                    "response_modality": "audio",
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 1200  # Even longer silence detection
                    }
                }
            },
            dynamic_variables={
                "user_role": "customs_officer",
                "interaction_mode": "wait_for_response",
                "disable_auto_responses": "true"
            }
        )

        conversation = Conversation(
            elevenlabs,
            agent_id,
            user_id,
            requires_auth=True,
            audio_interface=DefaultAudioInterface(),
            config=config,
            callback_agent_response=on_agent_response,
            callback_user_transcript=on_user_transcript
        )
        print("✅ Conversation configured for real interaction")
    except Exception as e:
        print(f"❌ Failed to create conversation: {e}")
        import traceback
        traceback.print_exc()
        return

    # Start conversation
    try:
        print("\n🚀 Starting interactive conversation...")
        print("🎙️  YOU are the customs officer")
        print("🤖  Agent will ask YOU questions and wait for YOUR answers")
        print("⏰  Agent will NOT answer itself")
        print("⌨️  Press Ctrl+C to end")
        print("-" * 50)

        conversation.start_session()
        print(f"📱 Interactive session started!")

        # Wait for conversation to end
        conversation_id = conversation.wait_for_session_end()
        print(f"✅ Session ended. ID: {conversation_id}")

        # Final transcript summary
        print(f"\n📝 Transcript saved: {transcript_file}")
        print(f"📊 Total conversation turns: {len(conversation_history)}")

    except KeyboardInterrupt:
        print("\n👋 Session interrupted by user")
        try:
            conversation.end_session()
            print("✅ Session ended gracefully")
        except:
            pass

        # Save transcript summary even on interruption
        print(f"\n📝 Transcript saved: {transcript_file}")
        print(f"📊 Total conversation turns: {len(conversation_history)}")

    except Exception as e:
        print(f"❌ Error during conversation: {e}")
        try:
            conversation.end_session()
        except:
            pass

        # Save transcript summary even on error
        print(f"\n📝 Transcript saved: {transcript_file}")
        print(f"📊 Total conversation turns: {len(conversation_history)}")

if __name__ == "__main__":
    main()