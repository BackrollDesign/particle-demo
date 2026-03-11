precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform float u_time;
uniform float u_intensity;
uniform float u_glowRadius;
uniform float u_plasmaSpeed;
uniform float u_glowFalloff;
uniform float u_luminescence;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uvAspect = vec2(uv.x * aspect, uv.y);
  vec2 originAspect = vec2(u_origin.x * aspect, u_origin.y);
  float d = length(uvAspect - originAspect);
  float t = u_time * u_plasmaSpeed;
  float v = sin(d * 8.0 + t) + sin((uvAspect.x - originAspect.x) * 14.0 + t) * 0.35 + cos((uvAspect.y - originAspect.y) * 14.0 + t * 1.1) * 0.35;
  v = v * 0.5 + 0.5;
  float falloff = 1.0 - smoothstep(u_glowRadius * (1.0 - u_glowFalloff * 0.7), u_glowRadius, d);
  v *= falloff * u_intensity;
  vec3 white = vec3(1.0, 1.0, 1.0);
  vec3 blue = vec3(0.35, 0.65, 1.0);
  vec3 cyan = vec3(0.45, 0.82, 1.0);
  vec3 col = mix(mix(blue, cyan, 0.5), white, v * (0.6 + 0.4 * u_luminescence));
  float alpha = 0.9 * falloff * (0.7 + 0.3 * u_luminescence);
  gl_FragColor = vec4(col, alpha);
}
