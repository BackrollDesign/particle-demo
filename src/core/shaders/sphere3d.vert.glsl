precision mediump float;
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec3 a_tangent;
attribute vec2 a_uv;
uniform mat4 u_viewProj;
uniform mat4 u_model;
uniform float u_zExponent;
uniform float u_noiseAmplitude;
uniform float u_noisePeriod;
uniform float u_noiseHarmonics;
uniform float u_noiseSpeed;
uniform vec3 u_noiseOffset;
uniform float u_time;
uniform float u_bevelSize;
varying vec3 v_normal;
varying vec3 v_tangent;
varying vec3 v_position;
varying vec2 v_uv;

const float kMaxNoiseHarmonics = 8.0;
float pseudoNoise(vec3 p) {
  float n = sin(p.x * u_noisePeriod) * cos(p.y * u_noisePeriod * 1.3) + sin(p.z * u_noisePeriod * 0.7);
  for (float h = 2.0; h <= kMaxNoiseHarmonics; h += 1.0) {
    float w = 1.0 - step(u_noiseHarmonics + 0.5, h);
    n += w * 0.5 / h * (sin(p.x * u_noisePeriod * h) * cos(p.y * u_noisePeriod * 1.3 * h));
  }
  return n;
}

void main() {
  vec3 pos = a_position;
  vec3 nrm = a_normal;
  bool deformed = false;

  if (u_zExponent > 0.01 && abs(u_zExponent - 1.0) > 0.01) {
    float z = pos.z;
    pos.z = sign(z) * pow(abs(z), u_zExponent);
    deformed = true;
  }

  if (u_bevelSize > 0.001) {
    float r = length(pos);
    if (r > 0.001) {
      vec3 dir = pos / r;
      vec3 ad = abs(dir);
      float maxComp = max(ad.x, max(ad.y, ad.z));
      float bevel = pow(maxComp, u_bevelSize);
      pos *= bevel;
      deformed = true;
    }
  }

  if (u_noiseAmplitude > 0.001) {
    vec3 samplePos = (pos + u_noiseOffset) * 4.0 + vec3(u_time * u_noiseSpeed, 0.0, 0.0);
    float n = pseudoNoise(samplePos);
    pos += a_normal * u_noiseAmplitude * n * 0.1;
    deformed = true;
  }

  if (deformed) {
    float r = length(pos);
    if (r > 0.001) {
      nrm = normalize(pos);
    }
  }

  vec4 world = u_model * vec4(pos, 1.0);
  v_position = world.xyz;
  v_normal = normalize((u_model * vec4(nrm, 0.0)).xyz);
  v_tangent = normalize((u_model * vec4(a_tangent, 0.0)).xyz);
  v_uv = a_uv;
  gl_Position = u_viewProj * world;
}
