
const { performance } = require('perf_hooks');

// Mock Context
class MockContext {
  constructor() {
    this.calls = 0;
  }
  beginPath() { this.calls++; }
  moveTo() { this.calls++; }
  lineTo() { this.calls++; }
  stroke() { this.calls++; }
  fill() { this.calls++; }
  arc() { this.calls++; }
  rect() { this.calls++; }
  strokeRect() { this.calls++; }
  strokeText() { this.calls++; }
  fillText() { this.calls++; }
}

const drawTrajectoryOriginal = (
  ctx,
  trajectory,
  currentTime,
  isLive
) => {
    if (trajectory.length === 0) return;

    // Loop 1: Trajectory points
    trajectory.forEach((t, i) => {
    ctx.beginPath();
    ctx.fillStyle = i === trajectory.length - 1 ? '#ff00ff' : '#ffff0080';
    ctx.arc(t.center.x, t.center.y, 6, 0, Math.PI * 2);
    ctx.fill();
    });

    // Loop 2: Detection points
    if (!isLive) {
        trajectory.forEach((t) => {
        if (Math.abs(t.time - currentTime) > 0.3) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
            ctx.arc(t.center.x, t.center.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        });
    }
};

const drawTrajectoryOptimized = (
  ctx,
  trajectory,
  currentTime,
  isLive
) => {
    if (trajectory.length === 0) return;

    // Loop 1: Trajectory points
    if (trajectory.length > 0) {
        if (trajectory.length > 1) {
            ctx.beginPath();
            ctx.fillStyle = '#ffff0080';
            for (let i = 0; i < trajectory.length - 1; i++) {
                const t = trajectory[i];
                ctx.moveTo(t.center.x + 6, t.center.y);
                ctx.arc(t.center.x, t.center.y, 6, 0, Math.PI * 2);
            }
            ctx.fill();
        }

        const lastT = trajectory[trajectory.length - 1];
        ctx.beginPath();
        ctx.fillStyle = '#ff00ff';
        ctx.arc(lastT.center.x, lastT.center.y, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Loop 2: Detection points
    if (!isLive) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        let hasPoints = false;
        trajectory.forEach((t) => {
            if (Math.abs(t.time - currentTime) > 0.3) {
                ctx.moveTo(t.center.x + 4, t.center.y);
                ctx.arc(t.center.x, t.center.y, 4, 0, Math.PI * 2);
                hasPoints = true;
            }
        });
        if (hasPoints) {
            ctx.fill();
        }
    }
};

// Generate data
const trajectory = [];
for (let i = 0; i < 1000; i++) {
    trajectory.push({
        time: i * 0.1,
        box: { x1: 0, y1: 0, x2: 10, y2: 10 },
        center: { x: i, y: i },
        confidence: 0.9,
    });
}

const ctx = new MockContext();
const iterations = 1000;

// Warmup
for(let i=0; i<100; i++) drawTrajectoryOriginal(ctx, trajectory, 50, false); // currentTime=50 (middle)

const startOriginal = performance.now();
for(let i=0; i<iterations; i++) {
    drawTrajectoryOriginal(ctx, trajectory, 50, false);
}
const endOriginal = performance.now();

const ctxOpt = new MockContext();
// Warmup
for(let i=0; i<100; i++) drawTrajectoryOptimized(ctxOpt, trajectory, 50, false);

const startOptimized = performance.now();
for(let i=0; i<iterations; i++) {
    drawTrajectoryOptimized(ctxOpt, trajectory, 50, false);
}
const endOptimized = performance.now();

console.log(`Original Time: ${(endOriginal - startOriginal).toFixed(2)}ms`);
console.log(`Optimized Time: ${(endOptimized - startOptimized).toFixed(2)}ms`);
console.log(`Original Calls per run: ${ctx.calls / iterations}`);
console.log(`Optimized Calls per run: ${ctxOpt.calls / iterations}`);
console.log(`Speedup: ${((endOriginal - startOriginal) / (endOptimized - startOptimized)).toFixed(2)}x`);
