# Bolt's Journal

## 2024-05-22 - Reusing Canvas for Live Video Processing
**Learning:** The `analyzeLiveStream` function in `Tracker.tsx` and `ServingTracker.tsx` was creating a new `<canvas>` element on every frame (10 FPS) via `extractFrameFromVideo` because it wasn't passing a reusable context. This causes unnecessary garbage collection and memory churn during live tracking.
**Action:** Always verify if utility functions like `extractFrameFromVideo` support resource reuse (like passing a `ctx`) and implement it in tight loops like `requestAnimationFrame`.
