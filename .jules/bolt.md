# Bolt's Journal

## 2025-02-23 - Canvas Context Reset Overhead
**Learning:** Setting `canvas.width` or `canvas.height` clears the canvas and resets the drawing context (styles, transforms, etc.), even if the value matches the current dimension. This operation is expensive and causes unnecessary work if done on every render or frame update.
**Action:** Always check if the dimension actually changed before assigning it: `if (canvas.width !== newWidth) canvas.width = newWidth;`.
