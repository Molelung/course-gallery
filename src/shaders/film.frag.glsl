// film.frag.glsl — 片元 Shader
// 负责：胶片颜色、Fresnel、颗粒

uniform float uTime;
uniform vec3 uColor;
uniform float uFresnelPower;
uniform float uOpacity;
uniform float uNoiseScale;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

// 简单噪声函数
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // Fresnel 效果
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - dot(viewDirection, vNormal), uFresnelPower);

  // 胶片颗粒噪声
  float grain = random(vUv * uNoiseScale + uTime * 0.1) * 0.1;

  // 最终颜色
  vec3 finalColor = uColor + fresnel * 0.3 + grain;

  // 边缘透明度（Fresnel 控制）
  float alpha = uOpacity - fresnel * 0.3;

  gl_FragColor = vec4(finalColor, alpha);
}
