## 2024-05-22 - Canvas Performance Optimization
**Learning:** `CanvasRenderingContext2D.fill()` is a rasterization operation and is significantly more expensive than path construction. In loops drawing many shapes (like trajectory points), calling `fill()` for every point (O(N)) causes massive overhead.
**Action:** Batch shapes of the same style into a single path using `ctx.moveTo()` to separate subpaths (e.g. for circles), then call `fill()` once (O(1)). This reduced fill calls from ~2000 to ~4 for a 1000-point trajectory.
