## 2024-05-23 - Context Reuse Discrepancy
**Learning:** Memory indicated that live analysis was already optimized with `useRef` context reuse, but code inspection revealed it was creating a new canvas every frame.
**Action:** Always verify "known" optimizations against actual code before assuming they exist. Trust code over memory.
