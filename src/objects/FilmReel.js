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
    this._createRollFace();

    this.dust = createDust();
    this.add(this.dust);

    this.setOffset(0);
    this._applyMorph();
  }

  /**
   * The roll's "axis" — what makes it read as an unopened roll of film
   * instead of a tangle of threads: two end-face discs textured with
   * concentric wound layers + a centre hub, plus a small spindle nub.
   * Procedural (an external GLB couldn't shrink with the unroll anyway).
   * The group is tilted toward the camera so the ringed face is visible.
   */
  _createRollFace() {
    // Concentric-rings face texture (wound film layers + hub + core hole)
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "#14141b";
    x.fillRect(0, 0, 512, 512);
    const cx = 256, cy = 256;
    for (let r = 250; r > 78; r -= 7) {
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI * 2);
      x.strokeStyle = (r % 14 < 7) ? "rgba(46,46,58,0.85)" : "rgba(16,16,22,0.9)";
      x.lineWidth = 4;
      x.stroke();
    }
    // Subtle sheen arcs on the face
    x.beginPath();
    x.arc(cx, cy, 200, -0.9, 0.4);
    x.strokeStyle = "rgba(160,170,200,0.14)";
    x.lineWidth = 26;
    x.stroke();
    // Hub + spindle hole
    x.beginPath();
    x.arc(cx, cy, 74, 0, Math.PI * 2);
    x.fillStyle = "#2b2b36";
    x.fill();
    x.beginPath();
    x.arc(cx, cy, 74, 0, Math.PI * 2);
    x.strokeStyle = "rgba(180,190,215,0.28)";
    x.lineWidth = 3;
    x.stroke();
    x.beginPath();
    x.arc(cx, cy, 30, 0, Math.PI * 2);
    x.fillStyle = "#07070b";
    x.fill();
    // Hub slots (like a real 35mm core)
    x.fillStyle = "#14141b";
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      x.save();
      x.translate(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52);
      x.rotate(a);
      x.fillRect(-7, -12, 14, 24);
      x.restore();
    }

    const faceTex = new THREE.CanvasTexture(c);
    faceTex.colorSpace = THREE.SRGBColorSpace;

    const discGeo = new THREE.CircleGeometry(1, 64);
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex, roughness: 0.55, metalness: 0.05, side: THREE.FrontSide
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x101016, roughness: 0.6, metalness: 0.05, side: THREE.FrontSide
    });

    this.rollGroup = new THREE.Group();
    this.rollGroup.rotation.order = "YXZ";

    this.rollTop = new THREE.Mesh(discGeo, faceMat);
    this.rollTop.rotation.x = -Math.PI / 2;      // faces up the roll's axis
    this.rollBottom = new THREE.Mesh(discGeo, backMat);
    this.rollBottom.rotation.x = Math.PI / 2;

    // Spindle nub sticking out of the hub
    const nub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.22, 24),
      new THREE.MeshStandardMaterial({ color: 0x3a3a46, roughness: 0.4, metalness: 0.3 })
    );
    nub.position.y = 1.0; // re-offset each frame to the roll's half height

    this.rollGroup.add(this.rollTop, this.rollBottom, nub);
    this.rollNub = nub;
    this.add(this.rollGroup);
  }

  /**
   * Winding path — shader.se style: the strip is flat & upright at the
   * active frame and recedes in a soft, breathable arc. The tails turn
   * gently OFF-SCREEN (x beyond the frustum), implying many more frames
   * continue out of view — no hooks, no aggressive Z swings.
   */
  _buildPath() {
    const pts = [
      new THREE.Vector3(-12.0, -1.40, -9.0),
      new THREE.Vector3(-9.5, -1.00, -6.2),
      new THREE.Vector3(-7.0, -0.60, -3.8),
      new THREE.Vector3(-4.5, -0.25, -1.9),
      new THREE.Vector3(-2.2, -0.06, -0.7),
      new THREE.Vector3( 0.0,  0.00,  0.0),
      new THREE.Vector3( 2.2,  0.06, -0.7),
      new THREE.Vector3( 4.5,  0.25, -1.9),
      new THREE.Vector3( 7.0,  0.60, -3.8),
      new THREE.Vector3( 9.5,  1.00, -6.2),
      new THREE.Vector3(12.0,  1.40, -9.0)
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

    // Exact local position of the roll's centre at unroll=0 (used by the
    // intro to centre the roll precisely on any device)
    this.rollLocal = this.basePts[0].clone().add(new THREE.Vector3(0, 0.1, -0.55));

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

      // Very gentle brightness falloff — the centre shouldn't pop harshly
      // against the tails; fog handles the final dissolve.
      const dNorm = Math.abs(i - centerIdx) / (SEGMENTS * 0.5);
      let b = 1.0 - Math.pow(dNorm, 2.3) * 0.5;
      b = THREE.MathUtils.clamp(b, 0.5, 1.0);
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
   * Recompute vertex positions each frame.
   *
   * Pull-from-one-end unroll: at unroll=0 the whole strip is coiled into a
   * standing roll at the strip's left tail; the peel point travels along the
   * path toward the right tail as `unroll` grows, so the film reads as being
   * pulled out of the roll and laid across the screen. On top of that:
   * elastic `bend`, a distance taper (the strip narrows as it recedes) and a
   * gentle paper-like sway. Only positions are rewritten each frame.
   */
  _applyMorph() {
    const posAttr = this.strip.geometry.attributes.position;
    const arr = posAttr.array;
    const L = this.pathLength;
    const halfL = L * 0.5;
    const band = L * 0.07;
    // Peel travels from just before the left tail to just past the right tail
    const peel = -halfL - band + this.unroll * (L + band * 2);
    const maxDist = halfL;
    const halfH = STRIP_H / 2;
    const t = this._elapsed;

    // The roll MOVES WITH the peel point — like unrolling a scroll / carpet:
    // it stands at the leading edge of the laid film, spinning and shrinking
    // as the film pays out, until nothing is left at the far end.
    const tPos = THREE.MathUtils.clamp((peel + halfL) / L, 0, 1);
    const fIdx = tPos * SEGMENTS;
    const i0 = Math.min(SEGMENTS - 1, Math.floor(fIdx));
    const i1 = i0 + 1;
    const fR = fIdx - i0;
    const pa = this.basePts[i0];
    const pb = this.basePts[i1];
    const rcx = pa.x + (pb.x - pa.x) * fR;
    const rcy = pa.y + (pb.y - pa.y) * fR + 0.1;
    const rcz = pa.z + (pb.z - pa.z) * fR - 0.55; // tucks behind the laid film
    const R = Math.max(0.12, 1.0 * (1 - this.unroll) + 0.1); // shrinking roll
    const TURNS = 12;            // tightly wound — many layers, like real film
    const spin = this.unroll * 4.2; // the roll visibly rotates as it unwinds
    // Tilt the whole coil toward the camera so the ringed end-face shows —
    // without the tilt the roll is edge-on and reads as tangled threads.
    const TILT_X = -0.55;
    const cosT = Math.cos(TILT_X), sinT = Math.sin(TILT_X);

    // Stash roll state so update() can sync the axis model (rollGroup)
    this._rollState = { x: rcx, y: rcy, z: rcz, R, spin, tilt: TILT_X,
                        visible: this.unroll < 0.985 };

    for (let i = 0; i <= SEGMENTS; i++) {
      const sd = this.segDist[i];
      const ad = Math.abs(sd);

      // 1 = laid flat (sd already passed by the peel), 0 = still on the roll
      const fw = 1 - THREE.MathUtils.smoothstep(sd, peel, peel + band);

      // --- Rolled position: tight spiral wound on the roll's tilted axis ---
      const over = Math.max(0, sd - peel);
      const layer = Math.min(1, over / L);                  // 0 peel → 1 core
      const radius = Math.max(0.09, R * (1 - layer * 0.55));
      const ang = layer * Math.PI * 2 * TURNS - spin;
      const sx = Math.cos(ang) * radius;                    // roll-local
      const sz = Math.sin(ang) * radius;                    // plane coords

      // --- Flat position + elastic bend + paper sway ---
      const bp = this.basePts[i];
      const nd = sd / maxDist;

      // Paper sway: two slow sine waves drifting along the strip; pinned at
      // the active frame, barely-there amplitude — a loose sheet breathing,
      // never wobbling.
      const swayAmp = Math.min(1, ad / 5);
      const swayY = (Math.sin(t * 0.62 + sd * 0.55) * 0.032 +
                     Math.sin(t * 1.07 + sd * 0.23 + 1.7) * 0.018) * swayAmp;
      const swayZ = Math.cos(t * 0.48 + sd * 0.42 + 0.6) * 0.04 * swayAmp;

      const fx = bp.x + this.bend * nd * 0.8;
      const fy = bp.y + this.bend * 0.08 * Math.cos(nd * Math.PI) + swayY * fw;
      const fz = bp.z - this.bend * (1 - Math.min(1, ad / maxDist) ** 2) * 0.45 + swayZ * fw;

      // Distance taper: the film narrows as it winds away — thinner, but
      // still visible, until the fog dissolves it.
      const taper = 1 / (1 + ad * 0.058);
      const hh = halfH * taper;

      // Write both verts; the coiled ones include the strip's half-height
      // along the roll's TILTED axis so the spiral matches the end-face discs
      const bi = (i * 2) * 3;
      const ti = (i * 2 + 1) * 3;
      for (const [idx, s] of [[bi, -1], [ti, 1]]) {
        // coil-local vertex: (sx, s*hh, sz) tilted about X by TILT_X
        const coilX = rcx + sx;
        const coilY = rcy + (s * hh) * cosT - sz * sinT;
        const coilZ = rcz + (s * hh) * sinT + sz * cosT;
        arr[idx]     = fx * fw + coilX * (1 - fw);
        arr[idx + 1] = (fy + s * hh) * fw + coilY * (1 - fw);
        arr[idx + 2] = fz * fw + coilZ * (1 - fw);
      }
    }
    posAttr.needsUpdate = true;
  }

  update(elapsed, delta) {
    this._elapsed = elapsed || 0;
    // Paper-damped follow for the elastic bow: heavy smoothing, no snap-back
    this.bend += (this.bendTarget - this.bend) * 0.055;
    // The coiled roll glows like a lightbox so it reads in the dark; the
    // glow settles to normal backlit-film level once laid out.
    if (this.strip && this.strip.material) {
      this.strip.material.emissiveIntensity = 0.2 + (1 - this.unroll) * 0.3;
    }
    this._applyMorph();

    // Sync the roll's axis model with the morph state
    if (this.rollGroup && this._rollState) {
      const rs = this._rollState;
      this.rollGroup.visible = rs.visible;
      if (rs.visible) {
        this.rollGroup.position.set(rs.x, rs.y, rs.z);
        this.rollGroup.rotation.set(rs.tilt, rs.spin, 0);
        this.rollGroup.scale.set(rs.R, 1, rs.R);
        // End faces sit at the strip's half height along the roll's axis
        const hh = (STRIP_H / 2) * 0.98;
        this.rollTop.position.y = hh;
        this.rollBottom.position.y = -hh;
        this.rollNub.position.y = hh + 0.08;
      }
    }

    if (this.dust) this.dust.rotation.y += (delta || 0.016) * 0.02;
  }
}
