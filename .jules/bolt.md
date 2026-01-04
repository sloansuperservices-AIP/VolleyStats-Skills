# Bolt's Journal

## 2024-05-22 - Initial Setup
**Learning:** Performance journal established.
**Action:** Document future learnings here.

## 2024-05-22 - Busy-Wait Loop Removal
**Learning:** `requestAnimationFrame` loops that throttle by checking `Date.now()` and returning early act as busy-wait loops, consuming main thread cycles unnecessarily (e.g. 5 wasted calls for every 1 active call at 10FPS/60Hz).
**Action:** Use `setTimeout` to schedule the next frame processing after the required delay, rather than polling every frame.
