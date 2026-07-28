import * as THREE from "three";

/**
 * Background: black up top, deep blue at the bottom (下蓝上黑), with a soft
 * pool of light low behind the film so the scene keeps a sense of depth
 * without going dark enough to swallow the model.
 */
function createGradientBackground() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Vertical gradient: breathable near-black top → vivid blue bottom
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#05070f");
  grad.addColorStop(0.28, "#08101f");
  grad.addColorStop(0.52, "#0e1d42");
  grad.addColorStop(0.74, "#1a356b");
  grad.addColorStop(0.9, "#2b5394");
  grad.addColorStop(1, "#3a66ae");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Depth glow: a wide, soft pool of light low in the frame — the "stage"
  // the film floats above; this is what reads as 景深 behind the model.
  const glow = ctx.createRadialGradient(
    canvas.width / 2, canvas.height * 0.8, 0,
    canvas.width / 2, canvas.height * 0.8, canvas.height * 0.4
  );
  glow.addColorStop(0, "rgba(120,170,255,0.22)");
  glow.addColorStop(0.55, "rgba(80,125,220,0.1)");
  glow.addColorStop(1, "rgba(80,125,220,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle starfield noise in the upper portion
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.5;
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

    // Depth fog: the winding tails of the film dissolve into the same blue
    // as the background instead of being clipped — nearby frames unaffected.
    this.scene.fog = new THREE.Fog(0x10234a, 9.5, 27);

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
