# Retrieval, verification, and correction

Extraction preserves PDF page numbers; other formats use logical page 1. Text becomes overlapping 220-word chunks. Default vectors are normalized 128-dimensional SHA-256 lexical feature hashes, not medical semantic embeddings. BM25 uses document frequency and length normalization. Ranks are fused with reciprocal-rank fusion, followed by lightweight overlap reranking and deduplication. Optional Sentence Transformers and cross-encoder models are configured server-side.

The demo quotes evidence. Configured model requests receive bounded source excerpts as untrusted data. Claim checks include exact quotation, numerical consistency, citation membership/matching, conservative overlap, and negation mismatch. Optional NLI adds model-estimated entailment/contradiction. Similarity alone never establishes support. Exact quotation establishes attribution, not truth.

Unsupported, partial, contradictory, and insufficient-evidence claims are removed. Retained claims receive citations to matching passages and are checked again. No supported claims means an explicit insufficient-evidence response. Confidence values are system estimates, not clinical probabilities.
