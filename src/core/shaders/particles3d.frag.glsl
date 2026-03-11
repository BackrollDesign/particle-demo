precision mediump float;
uniform vec3 u_color;
uniform float u_maxRadius;
varying float v_dist;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = 1.0 - smoothstep(0.0, 1.0, d);
  float depthFade = 1.0 - 0.4 * smoothstep(0.2, 1.0, v_dist / max(u_maxRadius, 0.01));
  a *= depthFade;
  gl_FragColor = vec4(u_color, a);
}
