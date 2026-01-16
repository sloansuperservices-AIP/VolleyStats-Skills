## 2024-05-22 - Canvas Allocation in Loops
**Learning:** Creating DOM elements (like `<canvas>`) and getting 2D contexts inside high-frequency loops (like `requestAnimationFrame`) causes significant Garbage Collection pressure and allocation overhead.
**Action:** Always create a single reusable canvas/context (e.g., using `useRef`) and pass it to helper functions, rather than creating new ones on every frame.
