import * as THREE from "three";
import { createFilmStripTexture, getDefaultFrames } from "../utils/CanvasTexture.js";
import createDust from "./DustParticles.js";

// ---- Film strip parameters ----
const FRAME_COUNT = 6;
const FRAME_WIDTH = 2.4;
const FRAME_HEIGHT = 1.5;
const BORDER_H = 0.24;
const STEP = FRAME_WIDTH + 0.12;
const STRIP_H = FRAME_HEIGHT + BORDER_H * 2;
const TILT = -0.14; // diagonal tilt (~8°) like shader.se

// ---- Gentle arc geometry ----
// A VERY LARGE radius so the curve is subtle - the film looks like a long
// physical strip that gently bends away into the distance on both sides.
// You can clearly see upcoming/previous frames receding behind.
const RADIUS = 14;
const ARC_PER_FRAME = STEP / RADIUS;
const VISIBLE_FRAMES = 5.0; // show 5 frames worth - center + 2 on each side going back
const TOTAL_ARC = ARC_PER_FRAME * VISIBLE_FRAMES;
const SEGMENTS = 420;

export default class FilmReel extends THREE.Group {

  constructor() {
    super();

    this.frameCount = FRAME_COUNT;
    this.frameWidth = FRAME_WIDTH;
    this.frameHeight = FRAME_HEIGHT;
    this.tilt = TILT;
    this.radius = RADIUS;

    this.offset = 0;

    // Diagonal tilt
    this.rotation.z = TILT;

    this.createStrip();

    this.dust = createDust();
    this.add(this.dust);

    this.setOffset(0);
  }

  /**
   * Build the film ribbon on a gentle arc.
   * Center faces the camera (+Z), sides recede backward (-Z) and outward.
   * The large radius makes it look like a real film strip gently curving
   * away, NOT a tight carousel ring.
   */
  createStrip() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    const halfH = STRIP_H / 2;

    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const theta = (u - 0.5) * TOTAL_ARC;

      // Cylinder surface: front at z=0, sides go BACKWARD
      const x = RADIUS * Math.sin(theta);
      const z = RADIUS * (Math.cos(theta) - 1); // 0 at center, negative at sides
      // Very subtle vertical undulation
      const y = Math.sin(theta * 2.0) * 0.06;

      // Outward-facing normal
      const nx = Math.sin(theta);
      const nz = Math.cos(theta);

      // Bottom vertex
      positions.push(x, y - halfH, z);
      normals.push(nx, 0, nz);
      uvs.push(u, 0);

      // Top vertex
      positions.push(x, y + halfH, z);
      normals.push(nx, 0, nz);
      uvs.push(u, 1);

      // Lighting: center is brightest, sides darken as they recede
      const distFromCenter = Math.abs(theta) / (TOTAL_ARC * 0.5);
      const b = 1.0 - distFromCenter * distFromCenter * 0.75;
      const brightness = THREE.MathUtils.clamp(b, 0.08, 1.0);
      colors.push(brightness, brightness, brightness, brightness, brightness, brightness);

      if (i < SEGMENTS) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    // Film strip texture
    this.stripTexture = createFilmStripTexture(getDefaultFrames(), {
      contentWFrac: FRAME_WIDTH / STEP,
      contentHFrac: FRAME_HEIGHT / STRIP_H,
      borderFrac: BORDER_H / STRIP_H
    });
    this.stripTexture.repeat.x = (TOTAL_ARC * RADIUS) / (STEP * FRAME_COUNT);

    const material = new THREE.MeshStandardMaterial({
      map: this.stripTexture,
      vertexColors: true,
      roughness: 0.32,
      metalness: 0.04,
      side: THREE.DoubleSide,
      envMapIntensity: 0.5
    });

    this.strip = new THREE.Mesh(geometry, material);
    this.add(this.strip);
  }

  /**
   * Scroll the film: texture offset moves frames along the arc.
   */
  setOffset(offset) {
    this.offset = offset;
    const N = this.frameCount;
    const arcLen = TOTAL_ARC * RADIUS;
    this.stripTexture.offset.x =
      (offset + 0.5) / N - (0.5 * arcLen) / (STEP * N);
  }

  frameIndexFromUV(uv) {
    const N = this.frameCount;
    let x = (uv.x * this.stripTexture.repeat.x + this.stripTexture.offset.x) % 1;
    if (x < 0) x += 1;
    return Math.floor(x * N) % N;
  }

  getActiveIndex() {
    return ((Math.round(this.offset) % this.frameCount) + this.frameCount) % this.frameCount;
  }

  update(elapsed, delta) {
    if (this.dust) {
      this.dust.rotation.y += (delta || 0.016) * 0.02;
    }
  }
}
