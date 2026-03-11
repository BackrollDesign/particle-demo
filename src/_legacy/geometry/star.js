/**
 * Four-pointed star geometry: 8 vertices (4 outer + 4 inner), triangle indices.
 * Spec: §3.3, §2.1 V1.
 */

/**
 * Vertices: alternating outer (0°, 90°, 180°, 270°) and inner (45°, 135°, 225°, 315°).
 * Flat array [x0,y0, x1,y1, ...] — 8 vertices, 16 elements.
 * @param {number} R_outer - Outer radius
 * @param {number} R_inner - Inner radius
 * @returns {number[]}
 */
export function getStarVertices(R_outer, R_inner) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const outerAngle = (i * 90 * Math.PI) / 180;
    out.push(R_outer * Math.cos(outerAngle), R_outer * Math.sin(outerAngle));
    const innerAngle = ((45 + i * 90) * Math.PI) / 180;
    out.push(R_inner * Math.cos(innerAngle), R_inner * Math.sin(innerAngle));
  }
  return out;
}

/**
 * Triangle indices for 4-point star (no center): 4 triangles, 12 indices.
 * Tips: (0,1,2), (2,3,4), (4,5,6), (6,7,0).
 * @returns {number[]}
 */
export function getStarIndices() {
  return [0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 0];
}

const STAR_R_OUTER = 1;
const STAR_R_INNER = 0.38;

/**
 * Star boundary as 8 points (outer, inner, ...) for particle clamping.
 * @returns {{ x: number, y: number }[]}
 */
export function getStarBoundary() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const oa = (i * 90 * Math.PI) / 180;
    out.push({ x: STAR_R_OUTER * Math.cos(oa), y: STAR_R_OUTER * Math.sin(oa) });
    const ia = ((45 + i * 90) * Math.PI) / 180;
    out.push({ x: STAR_R_INNER * Math.cos(ia), y: STAR_R_INNER * Math.sin(ia) });
  }
  return out;
}

/**
 * Point-in-polygon (ray casting). Polygon = star boundary.
 * @param {number} px
 * @param {number} py
 * @param {{ x: number, y: number }[]} polygon
 */
export function pointInPolygon(px, py, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/**
 * Closest point on segment [a,b] to p.
 * @param {{ x: number, y: number }} p
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function closestOnSegment(p, a, b) {
  const ax = a.x, ay = a.y, bx = b.x, by = b.y, px = p.x, py = p.y;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 <= 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy };
}

/**
 * Clamp point to inside star polygon. If outside, project to nearest boundary point.
 * @param {number} px
 * @param {number} py
 * @param {{ x: number, y: number }[]} polygon
 * @returns {{ x: number, y: number }}
 */
export function clampToStarBoundary(px, py, polygon) {
  if (pointInPolygon(px, py, polygon)) return { x: px, y: py };
  let bestX = polygon[0].x, bestY = polygon[0].y;
  let bestD2 = (px - bestX) ** 2 + (py - bestY) ** 2;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const q = closestOnSegment({ x: px, y: py }, polygon[j], polygon[i]);
    const d2 = (px - q.x) ** 2 + (py - q.y) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestX = q.x;
      bestY = q.y;
    }
  }
  return { x: bestX, y: bestY };
}

/**
 * Random point inside star (rejection sampling in [-1,1]²).
 * @param {{ x: number, y: number }[]} polygon
 * @returns {{ x: number, y: number }}
 */
export function randomPointInsideStar(polygon) {
  for (;;) {
    const x = (Math.random() * 2 - 1) * 0.98;
    const y = (Math.random() * 2 - 1) * 0.98;
    if (pointInPolygon(x, y, polygon)) return { x, y };
  }
}
