precision mediump float;
attribute vec2 a_position;
attribute float a_size;
uniform vec2 u_resolution;
uniform mat3 u_matrix;
uniform float u_pointScale;
uniform float u_maxRadius;
varying float v_dist;

void main() {
  vec2 clip = (u_matrix * vec3(a_position, 1.0)).xy;
  vec2 ndc = clip / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, ndc.y, 0.0, 1.0);
  v_dist = length(a_position);
  float depthScale = 1.0 - 0.35 * clamp(v_dist / max(u_maxRadius, 0.01), 0.0, 1.0);
  gl_PointSize = a_size * max(1.0, u_pointScale) * depthScale;
}
