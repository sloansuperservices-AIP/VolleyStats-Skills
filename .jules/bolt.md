## 2024-05-24 - Canvas Context Reuse in Live Analysis
**Learning:** Creating a new `HTMLCanvasElement` and `CanvasRenderingContext2D` on every frame (via `requestAnimationFrame`) causes significant Garbage Collection pressure and performance degradation.
**Action:** Always use a `useRef` to persist a single off-screen canvas/context and reuse it for frame extraction loops.
