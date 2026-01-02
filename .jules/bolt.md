## 2024-05-23 - Performance: Canvas Reuse in Live Analysis Loop

**Learning:** In video processing apps using `canvas` for frame extraction, creating a new `<canvas>` element (via `document.createElement`) in every frame of a requestAnimationFrame loop (even throttled) is a significant performance anti-pattern. It causes high memory churn and GC pressure.

**Optimized Pattern:**
Create a persistent `useRef<HTMLCanvasElement | null>(null)` and reuse it.

```typescript
const canvasRef = useRef<HTMLCanvasElement | null>(null);

const loop = () => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    // ... use canvasRef.current
}
```

**Context:** Found this in `Tracker.tsx` and `ServingTracker.tsx` where `analyzeLiveStream` was calling `extractFrameFromVideo` without passing a context, causing it to create a new canvas every 100ms.
