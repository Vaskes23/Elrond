# Gemini Integration TODO

## Current Issues
- Claude API calls still fail due to network restrictions, leaving classification stuck on the intelligent fallback instead of real LLM reasoning.
- Local `uvicorn` cannot bind to port 8000 inside the sandbox, preventing full end-to-end tests with the React client.
- End-to-end verification of semantic scores flowing into the frontend remains unconfirmed until both networking and port access are restored.

## Work Completed
- Re-enabled semantic search by removing the `DISABLE_EMBEDDING_MODEL` flag and forcing SentenceTransformer to load from the local HuggingFace cache.
- Confirmed cached MiniLM embeddings are consumed successfully; classification logs now show top-10 semantic matches with similarity scores.
- Updated the question generation endpoint to always return two `claude_question_*` items, ensuring the React questionnaire can transition off mock data once the backend responds.

## Results So Far
- Semantic similarity scoring works locally without external downloads; we observe meaningful similarity ranks for test inputs.
- When Claude calls fail, the system falls back gracefully to deterministic classification, maintaining API stability.
- Frontend build passes with the new `.env.local`, ready to target the FastAPI bridge once it is reachable.

## Targets
1. Run classification end-to-end with successful Claude responses once outbound access is approved; capture the reasoning payload and confidence scores.
2. Launch `uvicorn` in an environment that permits port binding, then exercise the questionnaire flow from the React UI to validate live semantic + Claude results.
3. Add automated smoke tests (or scripts) that hit `/api/questions/generate` and `/api/classify` to ensure regressions are caught after networking constraints are lifted.
