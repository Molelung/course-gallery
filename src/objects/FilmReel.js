import * as THREE from "three";
import { createFilmStripTexture, getDefaultFrames } from "../utils/CanvasTexture.js";
import createDust from "./DustParticles.js";

// ---- Film strip parameters ----
const FRAME_COUNT = getDefaultFrames().length;
const FRAME_WIDTH = 2.4;
const FRAME_HEIGHT = 1.5;
const BORDER_H = 0.24;
const STEP = FRAME_WIDTH + 0.12;
const STRIP_H = FRAME_HEIGHT + BORDER_H * 2;
const TILT = -0.14; // diagonal tilt (~8°) like shader.se
const SEGMENTS = 480;

const _up = new THREE.Vector3(0, 1, 0);

/**
 * FilmReel — a physical, winding strip of film.
 *
 * - The ribbon follows a CatmullRom curve that is flat & upright at the
 *   active frame, then winds away on both sides, sinking and receding until
 *   it fades into the darkness (fog + vertex-colour falloff) instead of
 *   being clipped at the screen edge.
 * - `setUnroll(t)` morphs the strip between a coiled roll (t=0) and the
 *   fully laid-out winding path (t=1) — used by the intro "unrolling" animation.
 * - `setBend(b)` applies an elastic bow to the strip while dragging.
 */
export default class FilmReel extends THREE.Group {

  constructor() {
    super();

    this.frameCount = FRAME_COUNT;
    this.frameWidth = FRAME_WIDTH;
    this.frameHeight = FRAME_HEIGHT;
    this.tilt = TILT;

    this.offset = 0;
    this.unroll = 0;      // 0 = rolled up, 1 = fully laid out
    this.bend = 0;        // smoothed elastic bow (follows bendTarget slowly)
    this.bendTarget = 0;  // set by the carousel, paper-like damped follow
    this._elapsed = 0;

    this.rotation.z = TILT;

    this._buildPath();
    this._createStrip();

    this.dust = createDust();
    this.add(this.dust);

    this.setOffset(0);
    this._applyMorph();
  }

  /**
   * Winding path — like a river: the strip meanders forward & backward in
   * depth (not monotonic), so the distant film appears to wander behind
   * itself before dissolving into the fog. Centre faces the camera.
   */
  _buildPath() {
    const pts = [
      new THREE.Vector3(-11.5, -1.9, -30.0),
      new THREE.Vector3(-9.0, -1.45, -16.5),
      new THREE.Vector3(-6.6, -1.00, -20.5),  // swings back — meander
      new THREE.Vector3(-4.8, -0.60, -10.5),
      new THREE.Vector3(-2.8, -0.25,  -4.6),
      new THREE.Vector3(-1.2, -0.05,  -1.4),
      new THREE.Vector3( 0.0,  0.00,   0.0),
      new THREE.Vector3( 1.2,  0.05,  -1.6),
      new THREE.Vector3( 2.8,  0.25,  -5.0),
      new THREE.Vector3( 4.8,  0.60, -10.0),
      new THREE.Vector3( 6.6,  1.00,  -7.6),  // swings forward — meander
      new THREE.Vector3( 9.0,  1.45, -16.0),
      new THREE.Vector3(11.5,  1.90, -29.0)
    ];
    this.curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    this.pathLength = this.curve.getLength();
  }

  _createStrip() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    // Uniform (arc-length) samples along the winding path
    this.basePts = this.curve.getSpacedPoints(SEGMENTS); // SEGMENTS+1 points

    // Index of the point closest to the origin (the active frame)
    let centerIdx = Math.floor(SEGMENTS / 2), best = Infinity;
    this.basePts.forEach((p, i) => {
      const d = p.length();
      if (d < best) { best = d; centerIdx = i; }
    });
    this.centerIdx = centerIdx;
    this.centerArc = (centerIdx / SEGMENTS) * this.pathLength;

    // Signed arc-length distance from the centre for every segment
    this.segDist = [];
    const avg = this.pathLength / SEGMENTS;
    for (let i = 0; i <= SEGMENTS; i++) this.segDist.push((i - centerIdx) * avg);

    const halfH = STRIP_H / 2;
    const tan = new THREE.Vector3();
    const side = new THREE.Vector3();
    const top = new THREE.Vector3();
    const bot = new THREE.Vector3();

    for (let i = 0; i <= SEGMENTS; i++) {
      const p = this.basePts[i];
      const iPrev = Math.max(0, i - 1);
      const iNext = Math.min(SEGMENTS, i + 1);
      tan.subVectors(this.basePts[iNext], this.basePts[iPrev]).normalize();
      // Face the normal toward the camera (+Z at the active frame)
      side.crossVectors(tan, _up).normalize();
      if (side.lengthSq() < 1e-6) side.set(0, 0, 1);

      top.copy(p).addScaledVector(_up, halfH);
      bot.copy(p).addScaledVector(_up, -halfH);

      positions.push(bot.x, bot.y, bot.z);
      normals.push(side.x, side.y, side.z);
      uvs.push(i / SEGMENTS, 0);

      positions.push(top.x, top.y, top.z);
      normals.push(side.x, side.y, side.z);
      uvs.push(i / SEGMENTS, 1);

      // Gentle brightness falloff — distant film dims but its content stays
      // readable; the final disappearance is handled by scene fog instead.
      const dNorm = Math.abs(i - centerIdx) / (SEGMENTS * 0.5);
      let b = 1.0 - Math.pow(dNorm, 2.1) * 0.68;
      b = THREE.MathUtils.clamp(b, 0.32, 1.0);
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
    // Generous bounds: the strip morphs every frame, so keep a sphere that
    // covers both the coil and the fully laid-out path for reliable raycasts.
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, -this.pathLength * 0.25),
      this.pathLength
    );

    this.stripTexture = createFilmStripTexture(getDefaultFrames(), {
      contentWFrac: FRAME_WIDTH / STEP,
      contentHFrac: FRAME_HEIGHT / STRIP_H,
      borderFrac: BORDER_H / STRIP_H
    });
    this.stripTexture.repeat.x = this.pathLength / (STEP * FRAME_COUNT);

    // Physical material — real celluloid film: non-metallic plastic with a
    // glossy clearcoat, and a gentle self-illumination so the frames read as
    // backlit film on a lightbox (content stays visible into the distance).
    const material = new THREE.MeshPhysicalMaterial({
      map: this.stripTexture,
      emissiveMap: this.stripTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
      vertexColors: true,
      roughness: 0.46,
      metalness: 0.0,
      clearcoat: 0.72,
      clearcoatRoughness: 0.34,
      specularIntensity: 0.55,
      side: THREE.DoubleSide,
      envMapIntensity: 0.55
    });

    this.strip = new THREE.Mesh(geometry, material);
    this.add(this.strip);
  }

  /** Scroll the film: texture offset moves frames along the path. */
  setOffset(offset) {
    this.offset = offset;
    const N = this.frameCount;
    this.stripTexture.offset.x =
      (offset + 0.5) / N - this.centerArc / (STEP * N);
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

  /** Intro unroll amount (0 rolled → 1 flat). */
  setUnroll(t) {
    this.unroll = THREE.MathUtils.clamp(t, 0, 1);
  }

  /** Elastic bow while dragging (-1..1) — smoothed internally, paper-like. */
  setBend(b) {
    this.bendTarget = THREE.MathUtils.clamp(b, -1, 1);
  }

  /**
   * Recompute vertex positions each frame: blend between the coiled roll and
   * the flat winding path (driven by `unroll`), plus the elastic `bend`, a
   * distance taper (the strip grows thinner as it recedes, like a river
   * narrowing toward the horizon) and a gentle paper-like sway.
   * Cheap: only positions are rewritten (normals stay from the flat build).
   */
  _applyMorph() {
    const posAttr = this.strip.geometry.attributes.position;
    const arr = posAttr.array;
    const maxDist = this.pathLength * 0.5;
    const band = maxDist * 0.16;
    // Peel point travels from "-band" (fully rolled) to past the far end
    const reach = -band + this.unroll * (maxDist + band * 2.2);
    const R0 = 1.55;         // outer radius of the rolled reel
    const halfH = STRIP_H / 2;
    const t = this._elapsed;

    for (let i = 0; i <= SEGMENTS; i++) {
      const sd = this.segDist[i];
      const ad = Math.abs(sd);

      // 1 = laid flat, 0 = still on the roll
      const fw = 1 - THREE.MathUtils.smoothstep(ad, reach, reach + band);

      // --- Rolled (coil) position ---
      const over = Math.max(0, ad - reach);
      const layer = Math.min(1, over / maxDist);           // 0 peel → 1 deep core
      const radius = Math.max(0.1, R0 * (1 - layer * 0.86));
      const dir = sd >= 0 ? 1 : -1;
      const ang = (dir > 0 ? 0 : Math.PI) + layer * Math.PI * 5.0 + this.unroll * 2.2;
      const cx = Math.cos(ang) * radius;
      const cy = Math.sin(ang) * radius * 0.9;
      const cz = -0.35 - layer * 1.1;

      // --- Flat position + elastic bend + paper sway ---
      const bp = this.basePts[i];
      const nd = sd / maxDist;

      // Paper sway: two slow sine waves drifting along the strip; pinned at
      // the active frame, growing gently with distance — like a loose sheet
      // of film breathing, never springy.
      const swayAmp = Math.min(1, ad / 5);
      const swayY = (Math.sin(t * 0.62 + sd * 0.55) * 0.05 +
                     Math.sin(t * 1.07 + sd * 0.23 + 1.7) * 0.028) * swayAmp;
      const swayZ = Math.cos(t * 0.48 + sd * 0.42 + 0.6) * 0.06 * swayAmp;

      const fx = bp.x + this.bend * nd * 1.3;
      const fy = bp.y + this.bend * 0.12 * Math.cos(nd * Math.PI) + swayY * fw;
      const fz = bp.z - this.bend * (1 - Math.min(1, ad / maxDist) ** 2) * 0.7 + swayZ * fw;

      const X = fx * fw + cx * (1 - fw);
      const Y = fy * fw + cy * (1 - fw);
      const Z = fz * fw + cz * (1 - fw);

      // Distance taper: the film narrows as it winds away (≈45% at the far
      // ends) — reads as a real strip receding, thinner but still visible.
      const taper = 1 / (1 + ad * 0.058);
      const hh = halfH * taper;

      const bi = (i * 2) * 3;
      arr[bi] = X; arr[bi + 1] = Y - hh; arr[bi + 2] = Z;
      const ti = (i * 2 + 1) * 3;
      arr[ti] = X; arr[ti + 1] = Y + hh; arr[ti + 2] = Z;
    }
    posAttr.needsUpdate = true;
  }

  update(elapsed, delta) {
    this._elapsed = elapsed || 0;
    // Paper-damped follow for the elastic bow: heavy smoothing, no snap-back
    this.bend += (this.bendTarget - this.bend) * 0.055;
    this._applyMorph();
    if (this.dust) this.dust.rotation.y += (delta || 0.016) * 0.02;
  }
}
