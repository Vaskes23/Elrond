# ElevenLabs Agent Session Management Investigation Plan

## Problem Summary
**CRITICAL ISSUE IDENTIFIED**: The ElevenLabs agent opens a new session for every message exchange instead of maintaining conversation continuity within a single session. This breaks the conversational flow and prevents proper context retention.

### Symptoms:
- Agent responds with the same opening message repeatedly
- No memory of previous conversation turns
- Context not carried forward between exchanges
- Each API call appears to start fresh conversation
- Conversation history builds locally but doesn't affect agent responses

## Root Cause Investigation Plan

### Phase 1: Session Management Audit (IMMEDIATE - Day 1)
**Goal**: Map exact session flow and identify where new sessions are created

#### 1.1 Client Session Tracking
- [ ] Add session ID logging to every API call
- [ ] Track session creation vs session reuse patterns
- [ ] Log conversation_history state before/after each call
- [ ] Monitor ElevenLabsChatClient._conversation_history persistence

#### 1.2 API Endpoint Analysis
- [ ] Verify simulate-conversation endpoint behavior
- [ ] Test if endpoint maintains state between calls
- [ ] Check if conversation_context parameter is working correctly
- [ ] Analyze API response for session continuity indicators

#### 1.3 Client Implementation Review
```python
# Key areas to investigate:
# 1. ElevenLabsChatClient.start_session() - when is this called?
# 2. ElevenLabsChatClient.send() - does it create new sessions?
# 3. ProperDurinClient session management - single session throughout?
# 4. ChatMessage context passing between calls
```

**Deliverable**: Session flow diagram showing where sessions are created/reused

### Phase 2: API Behavior Testing (Day 2)
**Goal**: Determine if issue is client-side or server-side

#### 2.1 Manual API Testing
- [ ] Test simulate-conversation endpoint directly with curl/Postman
- [ ] Send sequential messages with same session context
- [ ] Verify if ElevenLabs API maintains conversation state
- [ ] Test different conversation_context formats

#### 2.2 Conversation Context Investigation
- [ ] Test minimal conversation context (single exchange)
- [ ] Test full conversation history in context
- [ ] Test different context formatting approaches
- [ ] Verify context parameter limits and requirements

#### 2.3 API Documentation Review
- [ ] Review ElevenLabs conversation simulation API docs
- [ ] Check for session persistence requirements
- [ ] Identify proper conversation continuation methods
- [ ] Look for context management best practices

**Deliverable**: API behavior report with test results

### Phase 3: Client Architecture Deep Dive (Day 3)
**Goal**: Fix session management in client code

#### 3.1 Session Lifecycle Audit
```python
# Investigate these critical paths:
def start_session(self) -> str:
    # Is this creating a new session every time?
    # Should this only be called once?

def send(self, session_id: str, message: ChatMessage) -> ChatMessage:
    # Does this maintain the session_id consistently?
    # Is conversation_history being used correctly?
    # Are we passing context properly to the API?
```

#### 3.2 Context Management Fix
- [ ] Ensure conversation_history accumulates properly
- [ ] Fix context parameter formatting for API
- [ ] Test session persistence across multiple calls
- [ ] Verify session_id consistency throughout conversation

#### 3.3 Integration Testing
- [ ] Test multi-turn conversations with fixed client
- [ ] Verify context carries forward between turns
- [ ] Test with different conversation lengths
- [ ] Validate session continuity in interactive mode

**Deliverable**: Fixed client implementation with proper session management

### Phase 4: WebSocket vs HTTP Comparison (Day 4)
**Goal**: Determine if WebSocket implementation has different session behavior

#### 4.1 WebSocket Session Management
- [ ] Review ElevenLabsWebSocketClient session handling
- [ ] Compare WebSocket vs HTTP session persistence
- [ ] Test if WebSocket maintains conversation state better
- [ ] Identify optimal connection method for session continuity

#### 4.2 Protocol-Specific Testing
- [ ] Test same conversation flow via WebSocket
- [ ] Test same conversation flow via HTTP
- [ ] Compare session behavior between protocols
- [ ] Document differences in session management

**Deliverable**: Protocol comparison report with recommendations

### Phase 5: Conversation Context Optimization (Day 5)
**Goal**: Optimize how conversation context is passed to maintain session continuity

#### 5.1 Context Format Testing
```python
# Test different context formats:
# Format 1: Full conversation history
"User: Hello\nAgent: Hi there\nUser: How are you?"

# Format 2: Structured conversation
{"conversation_history": [{"role": "user", "content": "Hello"}, ...]}

# Format 3: Contextual summary
"Previous context: User asked about product classification..."
```

#### 5.2 Context Size Optimization
- [ ] Test context parameter size limits
- [ ] Optimize conversation history truncation
- [ ] Test context summarization for long conversations
- [ ] Balance context detail vs API limits

**Deliverable**: Optimized context management strategy

## Implementation Priority

### Critical Path (Must Fix):
1. **Session ID Consistency** - Ensure same session_id used throughout conversation
2. **Conversation History Persistence** - Fix _conversation_history accumulation
3. **API Context Passing** - Properly format and pass conversation_context
4. **Client Session Management** - Fix ProperDurinClient to maintain single session

### Testing Strategy:
```python
# Test case: Multi-turn conversation
1. Start session -> get session_id_1
2. Send message 1 -> verify response with context
3. Send message 2 -> verify agent remembers message 1
4. Send message 3 -> verify agent remembers messages 1-2
5. Verify session_id remains same throughout
```

## Diagnostic Tools to Create

### Tool 1: Session Flow Tracer
```python
# session_tracer.py - Track session creation and reuse
class SessionTracer:
    def log_session_creation(self, session_id, context)
    def log_session_reuse(self, session_id, message)
    def log_api_call(self, session_id, payload, response)
    def generate_session_report(self)
```

### Tool 2: Context Validator
```python
# context_validator.py - Verify context is passed correctly
class ContextValidator:
    def validate_context_format(self, context)
    def check_context_completeness(self, conversation_history)
    def test_context_api_acceptance(self, context)
```

### Tool 3: Multi-Turn Conversation Tester
```python
# conversation_tester.py - Automated multi-turn testing
class ConversationTester:
    def run_multi_turn_test(self, turns=5)
    def verify_context_retention(self)
    def check_session_consistency(self)
```

## Known Issues to Investigate

### Issue 1: ElevenLabsChatClient Session Management
```python
# Current implementation may be creating new sessions:
def start_session(self) -> str:
    self._conversation_history = []  # Resets history!
    return f"elevenlabs-session-{len(self._conversation_history)}"  # Always returns session-0?
```

### Issue 2: API Context Parameter
```python
# Conversation context may not be formatted correctly:
"conversation_context": " ".join([
    f"{'User' if turn['role'] == 'user' else 'Agent'}: {turn['content']}"
    for turn in self._conversation_history[:-1]
])
```

### Issue 3: Session ID Generation
```python
# Session ID may not be unique or persistent:
return f"elevenlabs-session-{len(self._conversation_history)}"
# This could generate the same ID for different conversations
```

## Success Criteria

### Technical Metrics:
- [ ] Same session_id used for entire conversation (logged and verified)
- [ ] Agent responses show contextual awareness of previous turns
- [ ] Conversation_history accumulates properly in client
- [ ] API context parameter includes full conversation
- [ ] No repeated opening messages from agent

### Functional Validation:
- [ ] Multi-turn customs classification conversation works
- [ ] Agent remembers product details across exchanges
- [ ] Officer responses influence subsequent agent replies
- [ ] Natural conversation flow without repetition
- [ ] Session can be properly ended without data loss

### Test Cases:
1. **5-turn conversation test**: Agent should remember all previous context
2. **Product classification test**: Agent should maintain product details throughout
3. **Interactive officer test**: Agent should respond differently based on officer feedback
4. **Session persistence test**: Same session ID throughout entire conversation
5. **Context size test**: Long conversations should maintain key context

## Risk Mitigation

### Potential Issues:
1. **API Limitation**: ElevenLabs API may not support true session persistence
   - **Mitigation**: Implement client-side context management with intelligent summarization
2. **Context Size Limits**: Large conversation history may exceed API limits
   - **Mitigation**: Implement intelligent context truncation preserving key information
3. **Session Timeout**: Long conversations may cause session expiration
   - **Mitigation**: Implement session refresh mechanism and timeout detection

### Rollback Plan:
If session management cannot be fixed:
1. Implement conversation summarization between turns
2. Use context injection for each message with key previous context
3. Create session management wrapper that simulates continuity

## Timeline: 5 Days Total

### Day 1: Session Audit (8 hours)
- Morning: Add comprehensive session logging
- Afternoon: Analyze current session flow and identify issues

### Day 2: API Testing (8 hours)
- Morning: Direct API testing with manual tools
- Afternoon: Context format experimentation

### Day 3: Client Fixes (8 hours)
- Morning: Fix session management in ElevenLabsChatClient
- Afternoon: Fix ProperDurinClient session handling

### Day 4: Protocol Comparison (8 hours)
- Morning: WebSocket session testing
- Afternoon: HTTP vs WebSocket comparison

### Day 5: Optimization & Testing (8 hours)
- Morning: Context optimization and final fixes
- Afternoon: Comprehensive testing and validation

## Expected Outcome
A fully functional conversation system where:
- ✅ Single session maintained throughout entire conversation
- ✅ Agent shows contextual awareness and memory
- ✅ Natural back-and-forth dialogue without repetition
- ✅ Proper customs classification workflow with continuity
- ✅ Robust session management handles edge cases
- ✅ Clear logging shows session lifecycle for debugging

## Immediate Next Actions (Today)
1. **Create session_tracer.py** to log all session activity
2. **Add session ID logging** to every API call in existing code
3. **Run multi-turn test** with current implementation to baseline the issue
4. **Document exact session flow** with timestamps and session IDs
5. **Identify the line of code** where new sessions are incorrectly created