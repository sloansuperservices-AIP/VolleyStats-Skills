export type Point = { x: number; y: number };

export const getDistance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

export const isPointInCircle = (point: Point, center: Point, radius: Point) => {
  const r = getDistance(center, radius);
  return getDistance(point, center) <= r;
};

export const isPointInRect = (point: Point, p1: Point, p2: Point) => {
  const xMin = Math.min(p1.x, p2.x);
  const xMax = Math.max(p1.x, p2.x);
  const yMin = Math.min(p1.y, p2.y);
  const yMax = Math.max(p1.y, p2.y);
  return point.x >= xMin && point.x <= xMax && point.y >= yMin && point.y <= yMax;
};

// Line intersection
export const doIntersect = (p1: Point, q1: Point, p2: Point, q2: Point) => {
  const onSegment = (p: Point, r: Point, q: Point) =>
    q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);

  const orientation = (p: Point, q: Point, r: Point) => {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return (val > 0) ? 1 : 2;
  };

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;

  // Special Cases (collinear)
  if (o1 === 0 && onSegment(p1, q1, p2)) return true;
  if (o2 === 0 && onSegment(p1, q1, q2)) return true;
  if (o3 === 0 && onSegment(p2, q2, p1)) return true;
  if (o4 === 0 && onSegment(p2, q2, q1)) return true;

  return false;
};
