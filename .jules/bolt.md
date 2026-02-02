## 2024-05-23 - Unused Optimization Parameters
**Learning:** Utility functions often already support optimization (e.g., optional buffer/context arguments) that are ignored by consumer code, leading to unnecessary allocations in hot loops.
**Action:** Always inspect the signature of utility functions in performance-critical loops to check for existing reuse mechanisms before rewriting them.
