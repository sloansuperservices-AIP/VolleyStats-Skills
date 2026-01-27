## 2025-02-18 - Reuse CanvasRenderingContext2D for video processing
**Learning:** Creating a new `HTMLCanvasElement` and `CanvasRenderingContext2D` for every frame in a video analysis loop creates significant garbage collection overhead.
**Action:** Use a `useRef` to store a single `CanvasRenderingContext2D` instance (initialized with `{ willReadFrequently: true }`) and reuse it across frames. Pass this context to any frame extraction utilities.
