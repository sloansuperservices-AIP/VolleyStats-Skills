## 2024-05-23 - Canvas Context Performance
**Learning:** Setting `canvas.width` or `canvas.height` resets the 2D context even if the values are identical to the current dimensions. This forces expensive buffer reallocations and state resets.
**Action:** Always check if dimensions have actually changed before assigning them to a canvas element in a render loop or `useEffect`.
