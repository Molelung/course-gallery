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
const TILT = -0.12; // diagonal tilt of the whole carousel (radians, ~7°)

// ---- Cylindrical carousel geometry ----
// The film wraps around an invisible cylinder. The camera sits near the
// cylinder axis looking outward at the front frame. Adjacent frames curve
// away naturally, creating the "fold" and visible neighbouring panels.
const RADIUS = 4.2;                       // cylinder radius
const ARC_PER_FRAME = STEP / RADIUS;      // angle one frame tile subtends
const VISIBLE_FRAMES = 3.4;               // how many frames are visible total
const TOTAL_ARC = ARC_PER_FRAME * VISIBLE_FRAMES;
const SEGMENTS = 360;                     // ribbon resolution

export default class FilmReel extends THREE.Group {

  constructor() {
    super();

    this.frameCount = FRAME_COUNT;
    this.frameWidth = FRAME_WIDTH;
    this.frameHeight = FRAME_HEIGHT;
    this.tilt = TILT;
    this.radius = RADIUS;

    this.offset = 0;

    // Diagonal tilt like shader.se
    this.rotation.z = TILT;

    this.createStrip();

    this.dust = createDust();
    this.add(this.dust);

    this.setOffset(0);
  }

  /**
   * Build the curved film ribbon wrapped around a cylinder.
   * The front-center of the cylinder faces +Z (toward the camera).
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
      // Angle: centered at 0 (front), spanning -TOTAL_ARC/2 to +TOTAL_ARC/2
      const theta = (u - 0.5) * TOTAL_ARC;

      // Position on cylinder surface (front is at +Z)
      const x = RADIUS * Math.sin(theta);
      const z = RADIUS * Math.cos(theta) - RADIUS; // shift so front is at z=0
      // Slight vertical wave for organic feel
      const y = Math.sin(theta * 1.5) * 0.12;

      // Normal points outward from cylinder axis
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

      // Depth-based vertex lighting: center bright, edges fade
      const fade = Math.cos(theta * 0.85);
      const b = THREE.MathUtils.clamp(fade, 0.12, 1.0);
      colors.push(b, b, b, b, b, b);

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
    // Repeat texture along the arc so frames tile correctly
    this.stripTexture.repeat.x = (TOTAL_ARC * RADIUS) / (STEP * FRAME_COUNT);

    const material = new THREE.MeshStandardMaterial({
      map: this.stripTexture,
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.05,
      side: THREE.DoubleSide,
      envMapIntensity: 0.5
    });

    this.strip = new THREE.Mesh(geometry, material);
    this.add(this.strip);
  }

  /**
   * Slide the film along the cylinder: texture offset scrolls frames.
   */
  setOffset(offset) {
    this.offset = offset;
    const N = this.frameCount;
    // Center the active frame at the front of the cylinder
    const arcLen = TOTAL_ARC * RADIUS;
    const centerFrac = 0.5; // UV center of the visible ribbon
    this.stripTexture.offset.x =
      (offset + 0.5) / N - (centerFrac * arcLen) / (STEP * N);
  }

  /**
   * Frame index from UV hit (for raycasting clicks).
   */
  frameIndexFromUV(uv) {
    const N = this.frameCount;
    let x = (uv.x * this.stripTexture.repeat.x + this.stripTexture.offset.x) % 1;
    if (x < 0) x += 1;
    return Math.floor(x * N) % N;
  }

  /**
   * Index of the frame currently at the front-center.
   */
  getActiveIndex() {
    return ((Math.round(this.offset) % this.frameCount) + this.frameCount) % this.frameCount;
  }

  update(elapsed, delta) {
    if (this.dust) {
      this.dust.rotation.y += (delta || 0.016) * 0.02;
    }
  }
}
