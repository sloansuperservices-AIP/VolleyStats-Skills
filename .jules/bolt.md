## 2026-02-01 - [Batched Canvas Rendering]
**Learning:** In canvas-heavy applications, the overhead of individual `ctx.beginPath()` and `ctx.fill()` calls for each element (O(N)) is a significant performance bottleneck. Batching thousands of sub-paths (using `ctx.moveTo`) into a single path (O(1) draw calls) dramatically reduces CPU overhead.
**Action:** When drawing multiple identical shapes (e.g., points, trajectory lines), always batch them into a single path/stroke/fill operation using `moveTo` to separate disconnected components.
