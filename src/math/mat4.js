/**
 * 4x4 matrices (column-major) for 3D view and projection.
 */

/**
 * @returns {Float32Array} identity
 */
export function create() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

/**
 * out = a * b (column-major)
 * @param {Float32Array} out
 * @param {Float32Array} a
 * @param {Float32Array} b
 */
export function multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  const b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  const b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
  const b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
  const b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
  out[0] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
  out[1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
  out[2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
  out[3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  out[4] = a00 * b4 + a10 * b5 + a20 * b6 + a30 * b7;
  out[5] = a01 * b4 + a11 * b5 + a21 * b6 + a31 * b7;
  out[6] = a02 * b4 + a12 * b5 + a22 * b6 + a32 * b7;
  out[7] = a03 * b4 + a13 * b5 + a23 * b6 + a33 * b7;
  out[8] = a00 * b8 + a10 * b9 + a20 * b10 + a30 * b11;
  out[9] = a01 * b8 + a11 * b9 + a21 * b10 + a31 * b11;
  out[10] = a02 * b8 + a12 * b9 + a22 * b10 + a32 * b11;
  out[11] = a03 * b8 + a13 * b9 + a23 * b10 + a33 * b11;
  out[12] = a00 * b12 + a10 * b13 + a20 * b14 + a30 * b15;
  out[13] = a01 * b12 + a11 * b13 + a21 * b14 + a31 * b15;
  out[14] = a02 * b12 + a12 * b13 + a22 * b14 + a32 * b15;
  out[15] = a03 * b12 + a13 * b13 + a23 * b14 + a33 * b15;
  return out;
}

/**
 * Perspective projection (column-major).
 * @param {Float32Array} out
 * @param {number} fovYRad - vertical FOV in radians
 * @param {number} aspect - width/height
 * @param {number} near
 * @param {number} far
 */
export function perspective(out, fovYRad, aspect, near, far) {
  const f = 1 / Math.tan(fovYRad / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
  out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
  return out;
}

/**
 * LookAt view matrix (column-major): camera at eye looking at target, up vector.
 * @param {Float32Array} out
 * @param {number} ex - eye x
 * @param {number} ey - eye y
 * @param {number} ez - eye z
 * @param {number} tx - target x
 * @param {number} ty - target y
 * @param {number} tz - target z
 * @param {number} ux - up x
 * @param {number} uy - up y
 * @param {number} uz - up z
 */
export function lookAt(out, ex, ey, ez, tx, ty, tz, ux, uy, uz) {
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  const len = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz);
  zx *= len; zy *= len; zz *= len;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
  const lenX = 1 / Math.sqrt(xx * xx + xy * xy + xz * xz);
  xx *= lenX; xy *= lenX; xz *= lenX;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = xy; out[2] = xz; out[3] = 0;
  out[4] = yx; out[5] = yy; out[6] = yz; out[7] = 0;
  out[8] = zx; out[9] = zy; out[10] = zz; out[11] = 0;
  out[12] = -(xx * ex + xy * ey + xz * ez);
  out[13] = -(yx * ex + yy * ey + yz * ez);
  out[14] = -(zx * ex + zy * ey + zz * ez);
  out[15] = 1;
  return out;
}
