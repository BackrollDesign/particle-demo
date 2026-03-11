precision mediump float;
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform mat3 u_matrix;

void main() {
  vec2 clip = (u_matrix * vec3(a_position, 1.0)).xy;
  vec2 ndc = clip / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, ndc.y, 0.0, 1.0);
}
