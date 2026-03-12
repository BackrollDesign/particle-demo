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
  vec2 uv = v_uv;
  vec3 N = normalize(v_normal);
  vec3 T = normalize(v_tangent);
  vec3 B = cross(N, T);
  vec3 V = normalize(u_cameraPosition - v_position);

  if (u_textureType == 1) {
    uv = vec2(atan(N.x, N.z) / 6.28318530718 + 0.5, asin(clamp(N.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
  }

  float disp = 0.0;
  if (u_useTexture != 0) {
    vec4 dispTex = texture2D(u_dispMap, uv);
    disp = dispTex.r;
    float vdx = dot(T, V);
    float vdy = dot(B, V);
    float vdz = dot(N, V);
    uv -= u_dispScale * disp * vec2(vdx, vdy) * step(0.01, abs(vdz));
  }

  vec3 n = N;
  if (u_useNormalMap != 0) {
    vec3 nMap = texture2D(u_normalMap, uv).rgb * 2.0 - 1.0;
    nMap.xy *= u_normalStrength;
    mat3 TBN = mat3(T, B, N);
    n = normalize(TBN * nMap);
  }

  vec3 L = normalize(u_lightDir);
  float diff = max(0.0, dot(n, L));
  float diffuse = u_lightIntensity * diff;
  vec3 albedo = u_color;

  if (u_useTexture != 0) {
    vec4 texColor = texture2D(u_texture, uv);
    albedo = mix(u_color, texColor.rgb, texColor.a * u_texStrength);
    float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
    float brMin = min(u_brightnessMin, u_brightnessMax);
    float brMax = max(u_brightnessMin, u_brightnessMax);
    float br = brMax - brMin;
    if (br > 0.001 && lum > 0.001) albedo *= (brMin + br * smoothstep(0.0, 1.0, lum)) / lum;
    else if (brMax > 0.001) albedo *= brMax;
  }

  vec3 ambientTint = u_ambientColor;
  if (ambientTint.x + ambientTint.y + ambientTint.z < 0.01) ambientTint = vec3(1.0);
  vec3 col = albedo * (u_ambientStrength * ambientTint + diffuse);

  if (u_useTexture != 0) {
    float ao = 1.0;
    vec4 aoTex = texture2D(u_aoMap, uv);
    ao = mix(1.0, aoTex.r, u_aoStrength);
    col *= ao;

    float specStr = u_specStrength;
    vec4 specTex = texture2D(u_specMap, uv);
    specStr = mix(u_specStrength, specTex.r * u_specStrength, step(0.01, specTex.r + specTex.g + specTex.b));
    vec3 H = normalize(L + V);
    float spec = pow(max(0.0, dot(n, H)), 32.0) * specStr;
    col += vec3(1.0) * spec * u_lightIntensity;
  }

  float dist = length(v_position);
  float normDist = u_coreRadius > 0.001 ? (dist / u_coreRadius) : 0.0;
  float edge = 1.0 - smoothstep(0.85, 1.02, normDist);
  float radialFade = 1.0 - u_glowRadial * normDist;
  float glowCore = 0.6 + 0.4 * (1.0 - normDist);

  float glowMult = 1.0;
  if (u_starMode > 0.5) {
    glowMult = 2.5;
    col = mix(col, vec3(0.9, 0.92, 1.0), 0.35 * (1.0 - normDist));
  }

  float fresnel = pow(1.0 - max(0.0, dot(N, V)), u_fresnelPower);
  vec3 fresnelContrib = u_fresnelColor * fresnel * u_fresnelStrength;
  col += fresnelContrib;

  col += glowMult * u_glowStrength * radialFade * glowCore * u_ambientColor;
  col += glowMult * u_glowAmbient * radialFade * glowCore * u_ambientColor;

  float alpha = edge;
  if (u_starMode > 0.5) alpha = max(alpha, 0.5 + 0.4 * (1.0 - normDist));
  alpha = max(alpha, 0.15 + 0.2 * (1.0 - normDist));

  if (u_isGlowPass > 0.5) {
    float bloomAmt = u_bloomRange / 100.0;
    float glowFalloff = 1.0 - smoothstep(0.0, 1.0, normDist);
    float glowAlpha = glowFalloff * glowFalloff * bloomAmt * 0.6;
    vec3 glowColor = mix(u_color, u_fresnelColor, 0.3) * (u_ambientStrength + u_glowAmbient);
    if (u_starMode > 0.5) glowColor = mix(glowColor, vec3(0.9, 0.92, 1.0), 0.5);
    gl_FragColor = vec4(glowColor, glowAlpha);
    return;
  }

  if (u_fogEnabled > 0.5) {
    float fogDist = length(u_cameraPosition - v_position);
    float fogFactor = 0.0;
    if (u_fogType > 0.5) {
      fogFactor = 1.0 - exp(-u_fogDensity * fogDist);
      fogFactor = clamp(fogFactor, 0.0, 1.0);
    } else if (u_fogFar > u_fogNear) {
      fogFactor = clamp((fogDist - u_fogNear) / (u_fogFar - u_fogNear), 0.0, 1.0);
    }
    col = mix(col, u_fogColor, fogFactor);
  }

  gl_FragColor = vec4(col, min(1.0, alpha));
}
