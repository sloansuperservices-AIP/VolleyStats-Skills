# Bolt's Journal

## 2024-05-22 - Video Analysis Throttling
**Learning:** Video processing loops often run as fast as possible (requestAnimationFrame), but inference APIs or heavy processing usually don't need to run at 60fps.
**Action:** Always check for throttling/debouncing in video processing loops. If missing, implement a target FPS cap (e.g., 10fps for analysis) to save CPU/battery.

## 2024-05-22 - Canvas Dimension Thrashing
**Learning:** Resetting canvas dimensions (`canvas.width = ...`) clears the canvas and is an expensive operation. Doing this on every frame, even if dimensions haven't changed, is a major performance killer.
**Action:** Always wrap canvas resizing in a check: `if (canvas.width !== newWidth || canvas.height !== newHeight)`.
