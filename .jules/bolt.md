## 2025-05-22 - Canvas Drawing Batching
**Learning:** Found O(N) Canvas API calls (beginPath/fill) inside render loops for trajectory visualization. This pattern causes significant CPU overhead as `trajectory` arrays grow.
**Action:** When drawing collections of shapes (like particles or trajectory points) with shared styles, ALWAYS batch them into a single path using `moveTo` to separate subpaths. Note that batching `fill()` flattens overlapping transparency, eliminating "stacking" effects, which is usually preferred for clean visualizations but changes the visual output slightly.
