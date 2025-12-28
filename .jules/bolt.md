## 2024-05-23 - Canvas Context Reuse & Loop Corruption
**Learning:**
I discovered a critical performance bottleneck and code corruption in `Tracker.tsx` and `ServingTracker.tsx`.
1. **Performance:** The `analyzeLiveStream` loop was creating a new `HTMLCanvasElement` and `2DContext` on every single frame (10 FPS). This causes significant garbage collection overhead and memory churn.
   *   *Action:* Implemented `extractionContextRef` to reuse a single canvas/context for the entire session. `extractFrameFromVideo` utility already supported this but wasn't being used correctly.
2. **Corruption:** `Tracker.tsx` contained a duplicated code block where the `analyzeLiveStream` function appeared twice, merged in a way that caused a syntax error (cutting off inside a `center` object definition).
   *   *Action:* Removed the corrupted duplicate code and consolidated the logic.

**Action:** Always check `utils/` helpers first. The `extractFrameFromVideo` helper was already optimized for context reuse, but the consumer components were ignoring it.
