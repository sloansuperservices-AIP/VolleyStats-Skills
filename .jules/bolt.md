## 2024-05-23 - Canvas Drawing Performance
**Learning:** HTML5 Canvas `ctx.fill()` is an expensive operation as it involves rasterization. Calling it inside a loop for hundreds of points causes significant CPU overhead and frame drops, especially on mobile devices or during high-frequency updates.
**Action:** Batch geometry into a single Path2D or using `ctx.moveTo` + `ctx.arc` in a loop, then call `ctx.fill()` ONCE at the end. This reduces draw calls from O(N) to O(1).
