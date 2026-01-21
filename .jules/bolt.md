## 2024-05-23 - Canvas Context Reuse in Live Analysis
**Learning:** The live analysis loop (`analyzeLiveStream`) runs at 10 FPS and was previously creating a new `HTMLCanvasElement` and `CanvasRenderingContext2D` for every frame via `extractFrameFromVideo`. This creates significant GC pressure.
**Action:** Always use a persistent `useRef<CanvasRenderingContext2D>` for repetitive canvas operations in React components, and pass it to utility functions. Ensure `willReadFrequently: true` is set when `toBlob()` or `getImageData()` is used frequently.
