## 2024-05-24 - Canvas Context Pooling in Live Video Analysis
**Learning:**
React components performing high-frequency video analysis (e.g., 10 FPS) should avoid creating new DOM elements (like `<canvas>`) inside the loop. In `Tracker.tsx` and `ServingTracker.tsx`, `extractFrameFromVideo` was implicitly creating a new canvas element on every frame because no context was provided. This generates significant garbage collection pressure and DOM overhead.

**Action:**
Use a persistent `useRef<CanvasRenderingContext2D>` initialized lazily (or in `useEffect`) and pass it to frame extraction functions. This acts as a simple object pool for the expensive canvas resource. Always check utility functions (like `extractFrameFromVideo`) to see if they support resource reuse.
