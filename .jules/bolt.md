## 2024-05-23 - Prevent Unnecessary Canvas Resets
**Learning:** Setting `canvas.width` or `canvas.height` resets the canvas context (clearing it and resetting state like transformation matrix, styles, etc.) even if the value is the same. Doing this inside a render loop (e.g., `useEffect` dependent on video time) forces a heavy context reset on every frame, causing significant CPU overhead and potential flickering.
**Action:** Always check if the dimensions actually changed before assigning them: `if (canvas.width !== newWidth) canvas.width = newWidth;`.
