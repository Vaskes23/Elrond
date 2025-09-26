#!/usr/bin/env python3
"""
Quick test script to validate Claude API key and connectivity
"""
import os
import sys
from dotenv import load_dotenv
import anthropic

def test_claude_api():
    """Test Claude API connectivity and key validation"""

    # Load environment variables
    load_dotenv()

    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key:
        print("❌ ERROR: ANTHROPIC_API_KEY not found in environment")
        return False

    # Validate API key format
    if not api_key.startswith("sk-ant-api"):
        print(f"❌ ERROR: Invalid API key format. Expected sk-ant-api*, got {api_key[:10]}...")
        return False

    print(f"✅ API Key format valid: {api_key[:15]}...")

    try:
        # Initialize Claude client
        client = anthropic.Anthropic(api_key=api_key)
        print("✅ Claude client initialized successfully")

        # Test basic API call
        print("🧪 Testing basic Claude API call...")

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=50,
            messages=[
                {
                    "role": "user",
                    "content": "Reply with exactly 'API_TEST_SUCCESS' if you can read this message."
                }
            ]
        )

        response_text = response.content[0].text.strip()
        print(f"📥 Claude Response: '{response_text}'")

        if "API_TEST_SUCCESS" in response_text:
            print("🎉 Claude API connectivity test PASSED!")
            return True
        else:
            print("⚠️  Claude API responded but test phrase not found")
            return False

    except anthropic.APIConnectionError as e:
        print(f"❌ Network error connecting to Claude API: {e}")
        return False
    except anthropic.AuthenticationError as e:
        print(f"❌ Authentication error - invalid API key: {e}")
        return False
    except anthropic.APIError as e:
        print(f"❌ Claude API error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing Claude API Key and Connectivity...")
    success = test_claude_api()

    if success:
        print("\n✅ ALL TESTS PASSED - Ready for real integration!")
        sys.exit(0)
    else:
        print("\n❌ TESTS FAILED - Check API key and connection")
        sys.exit(1)