🔍 ElevenLabs API Debug Test
==================================================
This will show exactly what's being sent to and received from the API.

🔑 API Key: d64efdeb...
🤖 Agent ID: agent_3201k60p4ctyfg4smr22n17n6vxy
🌐 Base URL: https://api.elevenlabs.io/

💬 Ready for conversation! Type messages or 'quit' to exit.

You: hi how can i help

============================================================
📤 SENDING MESSAGE: 'hi how can i help'
============================================================
🌐 URL: https://api.elevenlabs.io//v1/convai/agents/agent_3201k60p4ctyfg4smr22n17n6vxy/simulate-conversation
📋 Headers: {
  "xi-api-key": "d64efdebeacd35f7cdff...",
  "Content-Type": "application/json"
}
📦 Payload:
{
  "simulation_specification": {
    "simulated_user_config": {
      "user_message": "hi how can i help",
      "conversation_context": ""
    }
  },
  "new_turns_limit": 1
}
📈 Context length: 0 chars
💾 History length: 1 turns

⏳ Making API request...
📥 RESPONSE RECEIVED
🔢 Status Code: 200
📊 Response Headers: {'date': 'Thu, 25 Sep 2025 21:00:36 GMT', 'server': 'uvicorn', 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, PATCH, OPTIONS, DELETE, GET, PUT', 'access-control-max-age': '600', 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'x-trace-id': '3986cb348df5c49a73c9c5772d541999', 'x-region': 'us-central1', 'content-encoding': 'gzip', 'vary': 'Accept-Encoding', 'Via': '1.1 google, 1.1 google', 'Alt-Svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000', 'Transfer-Encoding': 'chunked'}
✅ Response JSON:
{
  "simulated_conversation": [
    {
      "role": "agent",
      "agent_metadata": {
        "agent_id": "agent_3201k60p4ctyfg4smr22n17n6vxy",
        "workflow_node_id": null
      },
      "message": "Hi, I'm Durin, calling customs on behalf of Elrond",
      "multivoice_message": null,
      "tool_calls": [],
      "tool_results": [],
      "feedback": null,
      "llm_override": null,
      "time_in_call_secs": 0,
      "conversation_turn_metrics": null,
      "rag_retrieval_info": null,
      "llm_usage": null,
      "interrupted": false,
      "original_message": null,
      "source_medium": null
    },
    {
      "role": "user",
      "agent_metadata": null,
      "message": "Hello Durin, thank you for calling.  How can I assist you today on behalf of Elrond?",
      "multivoice_message": null,
      "tool_calls": [],
      "tool_results": [],
      "feedback": null,
      "llm_override": null,
      "time_in_call_secs": 0,
      "conversation_turn_metrics": null,
      "rag_retrieval_info": null,
      "llm_usage": null,
      "interrupted": false,
      "original_message": null,
      "source_medium": null
    },
    {
      "role": "agent",
      "agent_metadata": {
        "agent_id": "agent_3201k60p4ctyfg4smr22n17n6vxy",
        "workflow_node_id": null
      },
      "message": "Hello, I'm calling to confirm the customs classification for a product.  The item is a chocolate confection made with cocoa powder, sugar, and milk powder.  Our candidate codes include CN 1806.32.10 and CN 1806.90.19.  Could you please advise which CN code applies, and the legal basis?",
      "multivoice_message": null,
      "tool_calls": [],
      "tool_results": [],
      "feedback": null,
      "llm_override": null,
      "time_in_call_secs": 0,
      "conversation_turn_metrics": null,
      "rag_retrieval_info": null,
      "llm_usage": null,
      "interrupted": false,
      "original_message": null,
      "source_medium": null
    }
  ],
  "analysis": {
    "evaluation_criteria_results": {},
    "data_collection_results": {},
    "call_successful": "success",
    "transcript_summary": "Durin, representing Elrond, contacted customs to clarify the correct CN code for a chocolate confection made with cocoa powder, sugar, and milk powder, suggesting CN 1806.32.10 and CN 1806.90.19 as possible classifications and requesting the legal basis for the correct code.\n",
    "call_summary_title": "Customs classification inquiry"
  }
}
🔍 Found simulated_conversation with 3 items
   Turn 0: {'role': 'agent', 'agent_metadata': {'agent_id': 'agent_3201k60p4ctyfg4smr22n17n6vxy', 'workflow_node_id': None}, 'message': "Hi, I'm Durin, calling customs on behalf of Elrond", 'multivoice_message': None, 'tool_calls': [], 'tool_results': [], 'feedback': None, 'llm_override': None, 'time_in_call_secs': 0, 'conversation_turn_metrics': None, 'rag_retrieval_info': None, 'llm_usage': None, 'interrupted': False, 'original_message': None, 'source_medium': None}
🎯 Found agent response: 'Hi, I'm Durin, calling customs on behalf of Elrond'
✅ Agent response added to history

🤖 Agent: Hi, I'm Durin, calling customs on behalf of Elrond

📊 Conversation so far: 2 messages
You: how can i help you 

============================================================
📤 SENDING MESSAGE: 'how can i help you'
============================================================
🌐 URL: https://api.elevenlabs.io//v1/convai/agents/agent_3201k60p4ctyfg4smr22n17n6vxy/simulate-conversation
📋 Headers: {
  "xi-api-key": "d64efdebeacd35f7cdff...",
  "Content-Type": "application/json"
}
📦 Payload:
{
  "simulation_specification": {
    "simulated_user_config": {
      "user_message": "how can i help you",
      "conversation_context": "User: hi how can i help Agent: Hi, I'm Durin, calling customs on behalf of Elrond"
    }
  },
  "new_turns_limit": 1
}
📈 Context length: 81 chars
💾 History length: 3 turns

⏳ Making API request...
📥 RESPONSE RECEIVED
🔢 Status Code: 200
📊 Response Headers: {'date': 'Thu, 25 Sep 2025 21:00:50 GMT', 'server': 'uvicorn', 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, PATCH, OPTIONS, DELETE, GET, PUT', 'access-control-max-age': '600', 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'x-trace-id': 'e0adfa45152729e68f766cc7e3116f1d', 'x-region': 'us-central1', 'content-encoding': 'gzip', 'vary': 'Accept-Encoding', 'Via': '1.1 google, 1.1 google', 'Alt-Svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000', 'Transfer-Encoding': 'chunked'}
✅ Response JSON:
{
  "simulated_conversation": [
    {
      "role": "agent",
      "agent_metadata": {
        "agent_id": "agent_3201k60p4ctyfg4smr22n17n6vxy",
        "workflow_node_id": null
      },
      "message": "Hi, I'm Durin, calling customs on behalf of Elrond",
      "multivoice_message": null,
      "tool_calls": [],
      "tool_results": [],
      "feedback": null,
      "llm_override": null,
      "time_in_call_secs": 0,
      "conversation_turn_metrics": null,
      "rag_retrieval_info": null,
      "llm_usage": null,
      "interrupted": false,
      "original_message": null,
      "source_medium": null
    },
    {
      "role": "user",
      "agent_metadata": null,
      "message": "Hello Durin, thank you for calling.  How can I assist you today on behalf of Elrond?",
      "multivoice_message": null,
      "tool_calls": [],
      "tool_results": [],
      "feedback": null,
      "llm_override": null,
      "time_in_call_secs": 0,
      "conversation_turn_metrics": null,
      "rag_retrieval_info": null,
      "llm_usage": null,
      "interrupted": false,
      "original_message": null,
      "source_medium": null
    },
    {
      "role": "agent",
      "agent_metadata": {
        "agent_id": "agent_3201k60p4ctyfg4smr22n17n6vxy",
        "workflow_node_id": null
      },
      "message": "Hello, I'm calling to confirm the customs classification for a product.  The item is a chocolate confection made with cocoa powder, sugar, and milk powder.  Our candidate codes include CN 1806.32.10 and CN 1806.90.19.  Could you please advise which CN code applies, and the legal basis?",
      "multivoice_message": null,
      "tool_calls": [],
      "tool_results": [],
      "feedback": null,
      "llm_override": null,
      "time_in_call_secs": 0,
      "conversation_turn_metrics": null,
      "rag_retrieval_info": null,
      "llm_usage": null,
      "interrupted": false,
      "original_message": null,
      "source_medium": null
    }
  ],
  "analysis": {
    "evaluation_criteria_results": {},
    "data_collection_results": {},
    "call_successful": "success",
    "transcript_summary": "Durin, representing Elrond, contacted customs to clarify the correct CN code for a chocolate confection made with cocoa powder, sugar, and milk powder, suggesting CN 1806.32.10 and CN 1806.90.19 as possible classifications and requesting the legal basis for the correct code.\n",
    "call_summary_title": "Customs classification inquiry"
  }
}
🔍 Found simulated_conversation with 3 items
   Turn 0: {'role': 'agent', 'agent_metadata': {'agent_id': 'agent_3201k60p4ctyfg4smr22n17n6vxy', 'workflow_node_id': None}, 'message': "Hi, I'm Durin, calling customs on behalf of Elrond", 'multivoice_message': None, 'tool_calls': [], 'tool_results': [], 'feedback': None, 'llm_override': None, 'time_in_call_secs': 0, 'conversation_turn_metrics': None, 'rag_retrieval_info': None, 'llm_usage': None, 'interrupted': False, 'original_message': None, 'source_medium': None}
🎯 Found agent response: 'Hi, I'm Durin, calling customs on behalf of Elrond'
✅ Agent response added to history

🤖 Agent: Hi, I'm Durin, calling customs on behalf of Elrond

📊 Conversation so far: 4 messages