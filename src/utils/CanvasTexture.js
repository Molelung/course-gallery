import * as THREE from "three";

// Default color schemes for each frame
const SCHEMES = [
  { title: "Project Alpha", subtitle: "Interactive Experience", colorA: "#1a2a6c", colorB: "#b21f1f",
    desc: "An immersive interactive experience built with WebGL and Three.js, exploring real-time 3D storytelling in the browser." },
  { title: "Project Beta", subtitle: "3D Visualization", colorA: "#0f2027", colorB: "#2c5364",
    desc: "A data-driven 3D visualization that turns complex datasets into intuitive spatial graphics." },
  { title: "Project Gamma", subtitle: "Creative Coding", colorA: "#4a0e4e", colorB: "#f7b733",
    desc: "Creative coding experiments blending generative art, shaders and playful interaction." },
  { title: "Project Delta", subtitle: "WebGL Experiment", colorA: "#1d4350", colorB: "#a43931",
    desc: "A WebGL experiment pushing custom shaders and post-processing to their limits." },
  { title: "Project Epsilon", subtitle: "Motion Design", colorA: "#0b486b", colorB: "#f56217",
    desc: "A motion design study focused on rhythm, easing and cinematic transitions." },
  { title: "Project Zeta", subtitle: "Digital Art", colorA: "#360033", colorB: "#0b8793",
    desc: "A digital art collection rendered in real time, where code becomes the brush." }
];

/**
 * Generate a canvas texture for a film frame
 * @param {object} options - { title, subtitle, colorA, colorB }
 * @returns {THREE.CanvasTexture}
 */
export function createFrameTexture(options = {}) {
  const {
    title = "Untitled",
    subtitle = "",
    colorA = "#1a1a2e",
    colorB = "#16213e"
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid pattern
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Decorative circle
  ctx.beginPath();
  ctx.arc(canvas.width * 0.75, canvas.height * 0.35, 120, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();

  // Title (with glow for stronger contrast against the gradient)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 66px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 30);

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "28px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 40);
  }
  ctx.shadowBlur = 0;

  // Filmic vignette -> darker edges focus the eye on the content
  const vig = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.25,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.75
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle film grain
  ctx.globalAlpha = 0.05;
  for (let n = 0; n < 2600; n++) {
    const gx = Math.random() * canvas.width;
    const gy = Math.random() * canvas.height;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(gx, gy, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  // Bright inner frame border -> separates content from the dark film body
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 5;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Get all default frame data
 */
export function getDefaultFrames() {
  return SCHEMES;
}

/**
 * Build one long, continuous film-strip texture: 6 tiles side by side, each
 * with the dark film base, perforated edges (bright sprocket holes), edge
 * markings and the frame content. The strip mesh scrolls this texture via
 * texture.offset.x, so the film visually flows along its path.
 *
 * Proportions must match FilmReel: tile = STEP x STRIP_H,
 * content = FRAME_WIDTH x FRAME_HEIGHT, border = BORDER_H top & bottom.
 * @returns {THREE.CanvasTexture}
 */
export function createFilmStripTexture(frames, proportions) {
  const { contentWFrac, contentHFrac, borderFrac } = proportions;
  const TILE = 768;
  const N = frames.length;

  const canvas = document.createElement("canvas");
  canvas.width = TILE * N;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d");

  const borderH = Math.round(TILE * borderFrac);
  const contentH = Math.round(TILE * contentHFrac);
  const contentW = Math.round(TILE * contentWFrac);
  const contentX = Math.round((TILE - contentW) / 2);
  const contentY = borderH;

  for (let i = 0; i < N; i++) {
    const x0 = i * TILE;
    const f = frames[i];

    // Charcoal film base
    ctx.fillStyle = "#14141a";
    ctx.fillRect(x0, 0, TILE, TILE);

    // Darker perforated edge bands (top / bottom)
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(x0, 0, TILE, borderH);
    ctx.fillRect(x0, TILE - borderH, TILE, borderH);

    // Plastic sheen across the base
    const sheen = ctx.createLinearGradient(0, 0, 0, TILE);
    sheen.addColorStop(0, "rgba(255,255,255,0.07)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(255,255,255,0.045)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x0, 0, TILE, TILE);

    // Bright sprocket holes with a soft glow (5 per tile)
    const holeW = Math.round(TILE * 0.034);
    const holeH = Math.round(borderH * 0.5);
    ctx.save();
    ctx.shadowColor = "rgba(175,185,210,0.8)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#cdd3e2";
    for (let k = 0; k < 5; k++) {
      const hx = x0 + ((k + 0.5) / 5) * TILE - holeW / 2;
      ctx.fillRect(hx, (borderH - holeH) / 2, holeW, holeH);
      ctx.fillRect(hx, TILE - borderH + (borderH - holeH) / 2, holeW, holeH);
    }
    ctx.restore();

    // Film edge marking (bottom band, like real edge print)
    ctx.fillStyle = "rgba(200,205,220,0.34)";
    ctx.font = `600 ${Math.round(borderH * 0.3)}px 'Courier New', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`COURSE GALLERY 35MM  \u25b8 ${String(i + 1).padStart(2, "0")}A`,
      x0 + TILE * 0.06, TILE - borderH / 2 + borderH * 0.02);

    // ---- Frame content ----
    const cx = x0 + contentX;
    const grad = ctx.createLinearGradient(cx, contentY, cx + contentW, contentY + contentH);
    grad.addColorStop(0, f.colorA);
    grad.addColorStop(1, f.colorB);
    ctx.fillStyle = grad;
    ctx.fillRect(cx, contentY, contentW, contentH);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < contentW; gx += 44) {
      ctx.beginPath(); ctx.moveTo(cx + gx, contentY); ctx.lineTo(cx + gx, contentY + contentH); ctx.stroke();
    }
    for (let gy = 0; gy < contentH; gy += 44) {
      ctx.beginPath(); ctx.moveTo(cx, contentY + gy); ctx.lineTo(cx + contentW, contentY + gy); ctx.stroke();
    }

    // Decorative circle
    ctx.beginPath();
    ctx.arc(cx + contentW * 0.74, contentY + contentH * 0.32, contentH * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();

    // Title & subtitle
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 58px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(f.title, cx + contentW / 2, contentY + contentH / 2 - 26);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "26px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(f.subtitle, cx + contentW / 2, contentY + contentH / 2 + 36);
    ctx.shadowBlur = 0;

    // Filmic vignette on the content
    const vig = ctx.createRadialGradient(
      cx + contentW / 2, contentY + contentH / 2, contentH * 0.3,
      cx + contentW / 2, contentY + contentH / 2, contentH * 0.85
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = vig;
    ctx.fillRect(cx, contentY, contentW, contentH);

    // Film grain over the whole tile
    ctx.globalAlpha = 0.05;
    for (let n = 0; n < 2200; n++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(x0 + Math.random() * TILE, Math.random() * TILE, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    // Bright inner border separating content from the film base
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(cx + 3, contentY + 3, contentW - 6, contentH - 6);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}
