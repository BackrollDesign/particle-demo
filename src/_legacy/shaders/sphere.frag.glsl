precision mediump float;
varying vec2 v_position;
uniform vec3 u_color;

void main() {
  float d = length(v_position);
  float edge = 1.0 - smoothstep(0.08, 0.102, d);
  vec2 n = d > 0.001 ? v_position / d : vec2(1.0, 0.0);
  vec2 lightDir = normalize(vec2(0.4, 0.5));
  float diff = max(0.0, dot(n, lightDir));
  float shade = 0.35 + 0.65 * diff;
  vec3 col = u_color * shade;
  gl_FragColor = vec4(col, edge);
}
