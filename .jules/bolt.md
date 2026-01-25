## 2024-05-22 - Live Analysis Frame Extraction Optimization
**Learning:** `extractFrameFromVideo` was creating a new `<canvas>` element 10 times per second during live stream analysis because no context was provided. This caused unnecessary garbage collection pressure and DOM overhead.
**Action:** Always implement object pooling for Canvas/Context objects in high-frequency loops (like `requestAnimationFrame` or video processing loops). Pass a persistent `ref` to the extraction utility.
