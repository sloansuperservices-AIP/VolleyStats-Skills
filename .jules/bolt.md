## 2025-05-22 - Reusing Canvas Context for Video Frame Extraction
**Learning:** Calling `document.createElement('canvas')` and `getContext('2d')` inside a high-frequency loop (e.g., 10-60 FPS video analysis) causes significant garbage collection pressure and CPU overhead.
**Action:** Always use a persistent `useRef` to store a single `CanvasRenderingContext2D` instance and pass it to frame extraction utilities. Initialize it lazily with `{ willReadFrequently: true }` if you intend to read pixel data (like `toBlob`).
