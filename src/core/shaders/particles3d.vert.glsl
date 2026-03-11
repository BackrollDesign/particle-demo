precision mediump float;
attribute vec3 a_position;
attribute float a_size;
attribute float a_birthTime;
attribute float a_deathTime;
uniform mat4 u_viewProj;
uniform float u_pointScale;
uniform float u_maxRadius;
uniform float u_time;
uniform float u_particleStartSize;
uniform float u_particleEndSize;
varying float v_dist;

void main() {
  vec4 clip = u_viewProj * vec4(a_position, 1.0);
  gl_Position = clip;
  v_dist = length(a_position);
  float size;
  if (u_particleStartSize <= 0.0 && u_particleEndSize <= 0.0) {
    size = a_size;
  } else {
    float duration = max(a_deathTime - a_birthTime, 0.001);
    float normalizedLife = clamp((u_time - a_birthTime) / duration, 0.0, 1.0);
    size = mix(u_particleStartSize, u_particleEndSize, normalizedLife);
  }
  gl_PointSize = size * max(1.0, u_pointScale) * (1.0 - 0.2 * min(1.0, v_dist / max(u_maxRadius, 0.01)));
}
