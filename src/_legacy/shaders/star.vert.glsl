/* Fullscreen quad vertex shader for procedural burning-gas star.
   Passes star-space UV (star tips at radius ~1) to fragment shader. */
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform float u_scale;
varying vec2 v_starUV;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  /* NDC [-1,1] → pixels from canvas center → star-space (tips at ≈1) */
  vec2 centered = a_position * u_resolution * 0.5;
  v_starUV = centered / u_scale;
}
