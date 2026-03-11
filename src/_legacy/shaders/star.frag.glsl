precision mediump float;

varying vec2 v_starUV;
uniform float u_time;

/* ── Value noise helpers ─────────────────────────────────────────── */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);          /* smoothstep */
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/* 2 octaves of noise for cheaper gas turbulence */
float fbm(vec2 p) {
  return noise(p) * 0.6 + noise(p * 2.1 + 3.7) * 0.4;
}

void main() {
  vec2 p = v_starUV;
  float r = length(p);

  /* Early discard: nothing visible beyond radius 2 */
  if (r > 2.0) discard;

  float angle = atan(p.y, p.x);
  float t     = u_time * 0.55;

  /* ── Gas turbulence (animated) ───────────────────────────────── */
  /* Scale turbulence so it is stronger near center, fades at tips */
  float turbScale = 0.10 / (r * 2.5 + 0.4);
  float n1 = fbm(p * 4.0 + vec2( t * 0.8,  t * 0.5)) * 2.0 - 1.0;
  float n2 = fbm(p * 8.5 - vec2( t * 0.6, -t * 0.9)) * 2.0 - 1.0;

  float rp     = r     + n1 * turbScale;
  float anglep = angle + n2 * turbScale * 0.6;

  /* ── 4-ray beam pattern ──────────────────────────────────────── */
  /* cos(2·θ) peaks at 0°,90°,180°,270° (all 4 cardinal axes)
     and is zero at 45° diagonals. Raising to a power sharpens rays. */
  float cos2a = cos(2.0 * anglep);
  float beam  = pow(abs(cos2a), 5.0);          /* sharp 4-point rays */

  /* Ray narrows with distance: wide at root, thin at tip */
  float narrowing   = 1.0 / (1.0 + rp * 3.8);
  float rayIntensity = beam * narrowing * exp(-rp * 2.0);

  /* ── Core glow (circular) ────────────────────────────────────── */
  float core     = exp(-rp * 9.0);              /* white-hot center  */
  float midGlow  = exp(-rp * 3.2) * 0.45;      /* surrounding halo  */

  /* Add gas flicker in the inner region */
  float flicker = (fbm(p * 10.0 + vec2(t * 1.2, -t)) * 2.0 - 1.0)
                  * 0.06 * smoothstep(0.5, 0.0, r);

  float intensity = clamp(core + midGlow + rayIntensity * 0.85 + flicker,
                          0.0, 1.0);

  if (intensity < 0.005) discard;

  /* ── Color gradient: white-hot → yellow → orange → red ──────── */
  vec3 white  = vec3(1.00, 0.98, 0.92);
  vec3 yellow = vec3(1.00, 0.80, 0.22);
  vec3 orange = vec3(1.00, 0.40, 0.07);
  vec3 red    = vec3(0.55, 0.08, 0.02);

  float tc   = clamp(rp * 2.6, 0.0, 1.0);
  vec3 color = mix(white,  yellow, smoothstep(0.00, 0.33, tc));
  color      = mix(color,  orange, smoothstep(0.33, 0.66, tc));
  color      = mix(color,  red,    smoothstep(0.66, 1.00, tc));

  /* Additive-blend compatible output: premultiply color by intensity */
  gl_FragColor = vec4(color * intensity, intensity);
}
