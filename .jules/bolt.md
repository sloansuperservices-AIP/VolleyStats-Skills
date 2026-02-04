## 2024-05-22 - Repeated Canvas Allocation in Live Analysis
**Learning:** `analyzeLiveStream` in `Tracker` and `ServingTracker` creates a new DOM `<canvas>` element every 100ms via `extractFrameFromVideo` default behavior, causing high GC pressure and potential frame drops.
**Action:** Always reuse a single `CanvasRenderingContext2D` with `{ willReadFrequently: true }` for video frame extraction loops using a `useRef` to persist the context.
