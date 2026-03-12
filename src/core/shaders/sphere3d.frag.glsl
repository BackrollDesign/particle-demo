precision mediump float;
varying vec3 v_normal;
varying vec3 v_tangent;
varying vec3 v_position;
varying vec2 v_uv;
uniform vec3 u_color;
uniform vec3 u_lightDir;
uniform vec3 u_cameraPosition;
uniform float u_glowStrength;
uniform float u_glowAmbient;
uniform float u_lightIntensity;
uniform float u_ambientStrength;
uniform float u_coreRadius;
uniform float u_glowRadial;
uniform float u_bloomEnabled;
uniform float u_bloomRange;
uniform float u_dispScale;
uniform int u_useTexture;
uniform int u_useNormalMap;
uniform int u_textureType;
uniform float u_brightnessMin;
uniform float u_brightnessMax;
uniform sampler2D u_texture;
uniform sampler2D u_normalMap;
uniform sampler2D u_dispMap;
uniform sampler2D u_specMap;
uniform sampler2D u_aoMap;
uniform float u_texStrength;
uniform float u_normalStrength;
uniform float u_specStrength;
uniform float u_aoStrength;
uniform vec3 u_fresnelColor;
uniform float u_fresnelPower;
uniform float u_fresnelStrength;
uniform vec3 u_ambientColor;
uniform float u_starMode;
uniform float u_fogEnabled;
uniform float u_fogType;
uniform float u_fogNear;
uniform float u_fogFar;
uniform float u_fogDensity;
uniform vec3 u_fogColor;
uniform float u_isGlowPass;

void main() {
  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_cameraPosition - v_position);

  float dist = length(v_position);
  float normDist = u_coreRadius > 0.001 ? (dist / u_coreRadius) : 0.0;

  if (u_isGlowPass > 0.5) {
    float bloomAmt = u_bloomRange * 0.01;
    float glowFalloff = 1.0 - smoothstep(0.0, 1.0, normDist);
    float glowAlpha = glowFalloff * glowFalloff * bloomAmt * 0.6;
    vec3 glowColor = mix(u_color, u_fresnelColor, 0.3) * (u_ambientStrength + u_glowAmbient);
    glowColor = mix(glowColor, vec3(0.9, 0.92, 1.0), step(0.5, u_starMode) * 0.5);
    gl_FragColor = vec4(glowColor, glowAlpha);
    return;
  }

  vec2 uv = v_uv;
  vec3 T = normalize(v_tangent);
  vec3 B = cross(N, T);

  if (u_textureType == 1) {
    uv = vec2(atan(N.x, N.z) * 0.15915494309 + 0.5, asin(clamp(N.y, -1.0, 1.0)) * 0.31830988618 + 0.5);
  }

  if (u_useTexture != 0) {
    float disp = texture2D(u_dispMap, uv).r;
    float vdz = dot(N, V);
    uv -= u_dispScale * disp * vec2(dot(T, V), dot(B, V)) * step(0.01, abs(vdz));
  }

  vec3 n = N;
  if (u_useNormalMap != 0) {
    vec3 nMap = texture2D(u_normalMap, uv).rgb * 2.0 - 1.0;
    nMap.xy *= u_normalStrength;
    n = normalize(mat3(T, B, N) * nMap);
  }

  vec3 L = normalize(u_lightDir);
  float diffuse = u_lightIntensity * max(0.0, dot(n, L));
  vec3 albedo = u_color;

  if (u_useTexture != 0) {
    vec4 texColor = texture2D(u_texture, uv);
    albedo = mix(u_color, texColor.rgb, texColor.a * u_texStrength);
    float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
    float brMin = min(u_brightnessMin, u_brightnessMax);
    float brMax = max(u_brightnessMin, u_brightnessMax);
    float br = brMax - brMin;
    float scale = mix(brMax, (brMin + br * smoothstep(0.0, 1.0, lum)) / max(lum, 0.001), step(0.001, br) * step(0.001, lum));
    albedo *= max(scale, 0.0);
  }

  vec3 ambientTint = u_ambientColor;
  float ambSum = ambientTint.x + ambientTint.y + ambientTint.z;
  ambientTint = mix(vec3(1.0), ambientTint, step(0.01, ambSum));
  vec3 col = albedo * (u_ambientStrength * ambientTint + diffuse);

  if (u_useTexture != 0) {
    float ao = mix(1.0, texture2D(u_aoMap, uv).r, u_aoStrength);
    col *= ao;

    vec4 specTex = texture2D(u_specMap, uv);
    float specStr = mix(u_specStrength, specTex.r * u_specStrength, step(0.01, specTex.r + specTex.g + specTex.b));
    vec3 H = normalize(L + V);
    float spec = pow(max(0.0, dot(n, H)), 32.0) * specStr;
    col += spec * u_lightIntensity;
  }

  float edge = 1.0 - smoothstep(0.85, 1.02, normDist);
  float radialFade = 1.0 - u_glowRadial * normDist;
  float glowCore = 0.6 + 0.4 * (1.0 - normDist);

  float isStar = step(0.5, u_starMode);
  float glowMult = mix(1.0, 2.5, isStar);
  col = mix(col, mix(col, vec3(0.9, 0.92, 1.0), 0.35 * (1.0 - normDist)), isStar);

  float fresnel = pow(1.0 - max(0.0, dot(N, V)), u_fresnelPower);
  col += u_fresnelColor * fresnel * u_fresnelStrength;

  col += glowMult * (u_glowStrength + u_glowAmbient) * radialFade * glowCore * u_ambientColor;

  float alpha = edge;
  alpha = mix(alpha, max(alpha, 0.5 + 0.4 * (1.0 - normDist)), isStar);
  alpha = max(alpha, 0.15 + 0.2 * (1.0 - normDist));

  if (u_fogEnabled > 0.5) {
    float fogDist = length(u_cameraPosition - v_position);
    float isExp = step(0.5, u_fogType);
    float expFog = clamp(1.0 - exp(-u_fogDensity * fogDist), 0.0, 1.0);
    float linFog = clamp((fogDist - u_fogNear) / max(u_fogFar - u_fogNear, 0.001), 0.0, 1.0);
    col = mix(col, u_fogColor, mix(linFog, expFog, isExp));
  }

  gl_FragColor = vec4(col, min(1.0, alpha));
}
