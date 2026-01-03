## 2024-05-23 - Canvas Reutilization in Live Loop
**Learning:** `Tracker.tsx` and `ServingTracker.tsx` were creating a new `HTMLCanvasElement` on every frame (10 FPS) in the live analysis loop via `extractFrameFromVideo`. This causes unnecessary garbage collection and performance overhead.
**Action:** Always reuse canvas/context references for repetitive frame extraction loops using `useRef`.
