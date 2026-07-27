// MathUtils.js — 动画计算工具
// 例如：lerp、ease、clamp

// 线性插值
export function lerp(start, end, t) {
  return start + (end - start) * t
}

// 限制范围
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

// 缓动函数：Ease Out Cubic
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

// 缓动函数：Ease In Out Cubic
export function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// 缓动函数：Ease Out Elastic
export function easeOutElastic(t) {
  const c4 = (2 * Math.PI) / 3
  return t === 0
    ? 0
    : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

// 映射范围
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}
