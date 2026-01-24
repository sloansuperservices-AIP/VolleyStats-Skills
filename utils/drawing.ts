import { Point, getDistance } from './math';

export interface TrajectoryPoint {
  time: number;
  box: { x1: number; y1: number; x2: number; y2: number };
  center: Point;
  confidence: number;
  className?: string;
}

export type ZoneType = 'line' | 'circle' | 'square';

export interface Zone {
  id: string;
  type: ZoneType;
  points: Point[];
  label: string;
  color: string;
}

export const drawZones = (ctx: CanvasRenderingContext2D, zones: Zone[]) => {
  zones.forEach(zone => {
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = 5;
    ctx.fillStyle = zone.color + '40'; // Transparent fill

    ctx.beginPath();
    if (zone.type === 'line') {
      ctx.moveTo(zone.points[0].x, zone.points[0].y);
      ctx.lineTo(zone.points[1].x, zone.points[1].y);
    } else if (zone.type === 'circle') {
      const r = getDistance(zone.points[0], zone.points[1]);
      ctx.arc(zone.points[0].x, zone.points[0].y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (zone.type === 'square') {
       const p1 = zone.points[0];
       const p2 = zone.points[1];
       const x = Math.min(p1.x, p2.x);
       const y = Math.min(p1.y, p2.y);
       const w = Math.abs(p2.x - p1.x);
       const h = Math.abs(p2.y - p1.y);
       ctx.rect(x, y, w, h);
       ctx.fill();
    }
    ctx.stroke();

    // Label
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText(zone.label, zone.points[0].x + 10, zone.points[0].y - 10);
  });
};

export const drawTrajectory = (
  ctx: CanvasRenderingContext2D,
  trajectory: TrajectoryPoint[],
  currentTime: number,
  isLive: boolean
) => {
    if (trajectory.length === 0) return;

    // Draw trajectory path
    ctx.beginPath();
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    trajectory.forEach((t, i) => {
    if (i === 0) ctx.moveTo(t.center.x, t.center.y);
    else ctx.lineTo(t.center.x, t.center.y);
    });
    ctx.stroke();

    // Draw trajectory points as small circles
    // Batch drawing for performance
    ctx.beginPath();
    ctx.fillStyle = '#ffff0080';
    for (let i = 0; i < trajectory.length - 1; i++) {
      const t = trajectory[i];
      ctx.moveTo(t.center.x + 6, t.center.y);
      ctx.arc(t.center.x, t.center.y, 6, 0, Math.PI * 2);
    }
    ctx.fill();

    // Draw last point (different color)
    if (trajectory.length > 0) {
      const last = trajectory[trajectory.length - 1];
      ctx.beginPath();
      ctx.fillStyle = '#ff00ff';
      ctx.moveTo(last.center.x + 6, last.center.y);
      ctx.arc(last.center.x, last.center.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw current ball position if near current time (or last point if live)
    let currentPoint: TrajectoryPoint | undefined | null = null;
    if (isLive) {
        currentPoint = trajectory[trajectory.length - 1];
    } else {
        currentPoint = trajectory.find(p => Math.abs(p.time - currentTime) < 0.3);
    }

    if (currentPoint) {
    // Draw larger ball position indicator
    ctx.beginPath();
    ctx.fillStyle = '#ff00ff';
    ctx.arc(currentPoint.center.x, currentPoint.center.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw outer ring for visibility
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.arc(currentPoint.center.x, currentPoint.center.y, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Draw prominent bounding box with double-line effect
    const boxWidth = currentPoint.box.x2 - currentPoint.box.x1;
    const boxHeight = currentPoint.box.y2 - currentPoint.box.y1;

    // Outer box (white for contrast)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(
        currentPoint.box.x1 - 2,
        currentPoint.box.y1 - 2,
        boxWidth + 4,
        boxHeight + 4
    );

    // Inner box (magenta)
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(
        currentPoint.box.x1,
        currentPoint.box.y1,
        boxWidth,
        boxHeight
    );

    // Draw "BALL" label above bounding box
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ff00ff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const labelText = `BALL ${(currentPoint.confidence * 100).toFixed(0)}%`;
    ctx.strokeText(labelText, currentPoint.box.x1, currentPoint.box.y1 - 10);
    ctx.fillText(labelText, currentPoint.box.x1, currentPoint.box.y1 - 10);
    }

    // Draw all detection points as small indicators (dimmed if not current)
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
        if (hasPoints) ctx.fill();
    }
}
