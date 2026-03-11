precision mediump float;

varying vec2 v_uv;
uniform float u_time;
uniform float u_shape;  /* 0.0 = cross (| + —), 1.0 = X (diagonal) */
uniform vec3 u_coreColor;
uniform vec3 u_glowColor;

/* Distance from point p to line through center: (p.x-0.5, p.y-0.5) dot perp = 0 */
float distToLine(vec2 p, vec2 dir) {
  vec2 c = p - 0.5;
  vec2 perp = vec2(-dir.y, dir.x);
  return abs(dot(c, normalize(perp)));
}

/* Soft bar: 1 at center, 0 at edge. barHalfWidth in 0..1. */
float softBar(float dist, float barHalfWidth) {
  float core = barHalfWidth * 0.35;
  float edge = barHalfWidth * 1.2;
  return smoothstep(edge, core, dist);
}

/* Cross: horizontal + vertical bars. Returns combined intensity. */
float crossShape(vec2 uv) {
  float barW = 0.08;
  float d1 = abs(uv.y - 0.5);
  float d2 = abs(uv.x - 0.5);
  float bar1 = softBar(d1, barW);
  float bar2 = softBar(d2, barW);
  return max(bar1, bar2);
}

/* X shape: two lines at 45° and -45°. */
float xShape(vec2 uv) {
  float barW = 0.07;
  vec2 c = uv - 0.5;
  float d1 = abs(c.x + c.y) * 0.707107;
  float d2 = abs(c.x - c.y) * 0.707107;
  float bar1 = softBar(d1, barW);
  float bar2 = softBar(d2, barW);
  return max(bar1, bar2);
}

void main() {
  vec2 uv = v_uv;
  float shape = u_shape < 0.5 ? crossShape(uv) : xShape(uv);

  /* Animated glow pulse (breathing) */
  float pulse = 0.88 + 0.12 * sin(u_time * 1.4);
  float glowExpand = 0.5 + 0.08 * sin(u_time * 0.9);
  float distFromCenter = length(uv - 0.5);
  float glow = exp(-distFromCenter * (3.0 / glowExpand)) * pulse;

  float core = shape;
  float halo = glow * (1.0 - shape * 0.5);
  float intensity = core + halo * 0.7;
  intensity = clamp(intensity, 0.0, 1.0);

  vec3 color = mix(u_glowColor, u_coreColor, core);
  color = color + u_glowColor * halo * 0.4;
  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, intensity * 0.95);
}
