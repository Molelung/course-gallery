import * as THREE from "three";

/**
 * Build the vertical blue gradient background used by the reference site:
 * a near-black navy at the top easing down into a brighter cornflower blue at
 * the bottom, giving the dark film strip a vivid stage to sit against.
 */
function createGradientBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#05070f");
  grad.addColorStop(0.35, "#0d1633");
  grad.addColorStop(0.6, "#1b3161");
  grad.addColorStop(0.82, "#33568f");
  grad.addColorStop(1, "#5a82b8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
