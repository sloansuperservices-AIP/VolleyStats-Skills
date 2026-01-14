## 2026-01-14 - Canvas Context Reuse in Live Analysis
**Learning:** Instantiating a new `CanvasRenderingContext2D` (via `document.createElement('canvas')`) inside a high-frequency `requestAnimationFrame` loop creates significant garbage collection pressure.
**Action:** Always reuse a single offscreen canvas/context for frame extraction in video processing loops, storing it in a `useRef` to persist across renders without triggering them.
