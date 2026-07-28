import * as THREE from "three";

/**
 * Build the vertical blue gradient background used by the reference site:
 * a near-black navy at the top easing down into a brighter cornflower blue at
 * the bottom, giving the dark film strip a vivid stage to sit against.
 */
function createGradientBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Deeper, richer gradient — shader.se style dark blue night sky
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#030610");
  grad.addColorStop(0.25, "#070d1f");
  grad.addColorStop(0.5, "#0c1838");
  grad.addColorStop(0.72, "#1a3260");
  grad.addColorStop(0.88, "#33558f");
  grad.addColorStop(1, "#4a72a8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle starfield noise in the upper portion
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.55;
    const r = Math.random() * 0.8 + 0.2;
    const a = Math.random() * 0.5 + 0.15;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default class SceneManager {

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = createGradientBackground();

    this.objects = [];
  }

  add(object) {
    this.scene.add(object);
    this.objects.push(object);
  }

  update(elapsed, delta) {
    this.objects.forEach((obj) => {
      if (obj.update) obj.update(elapsed, delta);
    });
  }
}
