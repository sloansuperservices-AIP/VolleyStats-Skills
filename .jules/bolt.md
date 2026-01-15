## 2024-05-23 - Canvas Context Reuse in Live Analysis
**Learning:** Recreating a DOM Canvas element and getting its 2D context inside a recursive `requestAnimationFrame` loop (even if throttled) causes significant garbage collection pressure.
**Action:** Always use a `useRef` to store a reusable `CanvasRenderingContext2D` for any repetitive video analysis loop. Ensure the reusable canvas handles dynamic resizing by checking `canvas.width !== targetWidth`.
