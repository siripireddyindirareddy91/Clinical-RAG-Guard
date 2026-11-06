# Eight LangGraph nodes

1. Query understanding: normalize keywords, initialize state.
2. Retrieval: user-scoped hybrid retrieval, fusion, reranking, source citations.
3. Generation: extractive demo, configured OpenAI-compatible provider, or supplied draft.
4. Claim extraction: sentence-level claims and identifiers.
5. Verification: source matching, numbers, citations, optional NLI.
6. Detection: identify unsupported initial claims.
7. Correction: remove flagged statements, preserve attributed content, normalize citations.
8. Validation: re-extract and recheck the corrected claims.

Conditional routing permits up to three correction iterations. Provider requests retry and then fail visibly. SSE emits actual node completion, not simulated progress. Completed structured outputs, claims, evidence, correction history, and stage timings are persisted atomically. Intermediate crash recovery and durable LangGraph checkpoints are not implemented.
