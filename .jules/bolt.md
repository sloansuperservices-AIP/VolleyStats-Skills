## 2024-05-23 - Reusing Canvas Contexts
**Learning:** Creating `document.createElement('canvas')` and `getContext('2d')` inside a requestAnimationFrame loop (even throttled) causes significant GC pressure and DOM overhead.
**Action:** Always use a `useRef` to store a reusable offscreen canvas for repeated image processing tasks, and pass the context to helper functions. Use `{ willReadFrequently: true }` when extracting pixel data or using `toBlob`.
