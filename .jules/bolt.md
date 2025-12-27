## 2024-05-23 - [Canvas Optimization & Loop Throttling]
**Learning:** Recreating DOM elements (like `document.createElement('canvas')`) and getting 2D contexts inside a high-frequency loop (e.g., requestAnimationFrame) is a major performance killer.
**Action:** Always persist reuseable resources like off-screen canvases using `useRef`. Also, avoid setting `canvas.width` on every frame if the dimensions haven't changed, as this forces a canvas clear and buffer reallocation.
**Action:** Ensure recursive animation loops (like `analyzeLiveStream`) have explicit throttling (e.g., checking `Date.now()`) to prevent over-polling and freezing the UI, especially when doing heavy async work like inference.
