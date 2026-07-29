import * as THREE from "three";
import { createFilmStripTexture } from "../utils/CanvasTexture.js";
import createDust from "./DustParticles.js";

// ---- Film strip parameters ----
const FRAME_WIDTH = 2.4;
const FRAME_HEIGHT = 1.5;
const BORDER_H = 0.24;
const STEP = FRAME_WIDTH + 0.12;
const STRIP_H = FRAME_HEIGHT + BORDER_H * 2;
const TILT = -0.14; // diagonal tilt (~8°) like shader.se
const SEGMENTS = 480;

// ---- Wound-roll proportions (the closed, unopened look) ----
// Slim and cylindrical like a real fresh roll of film — not a fat blob:
// diameter ~1.3× the roll's width, few solid wound layers, visible axle.
const ROLL_R0 = 0.66;         // outer radius of the fresh roll
const ROLL_TURNS = 9;         // wound layers — few enough to read as solid film
const ROLL_LAYER_DROP = 0.38; // radius loss from the outer wrap to the core
const COIL_HALF_H = 0.5;      // a wound roll has constant width — no taper

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
 *
 * Each reel belongs to one instructor (courseSet): the strip texture is
 * built from that set's frames, and the wound roll carries a paper label
 * sticker with the instructor's name.
 */
export default class FilmReel extends THREE.Group {

  constructor(courseSet) {
    super();

    this.courseSet = courseSet;              // { id, instructor, series, frames }
    this.instructor = courseSet.instructor;
    const frames = courseSet.frames;

    this.frameCount = frames.length;
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
    this._createStrip(frames);
    this._createRollFace();
    this._createLabel();

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
    // Concentric-rings face texture (wound film layers + hub + axle hole).
    // The base tone sits a touch lighter than the scene's near-black so the
    // closed roll always reads against the background (跟背景略微不同).
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "#1e1e28";
    x.fillRect(0, 0, 512, 512);
    const cx = 256, cy = 256;
    // Wound film layers — alternating rings across the whole face
    for (let r = 252; r > 96; r -= 6) {
      x.beginPath();
      x.arc(cx, cy, r, 0, Math.PI * 2);
      x.strokeStyle = (r % 12 < 6) ? "rgba(64,64,80,0.9)" : "rgba(28,28,38,0.9)";
      x.lineWidth = 3.5;
      x.stroke();
    }
    // Soft plastic sheen across the face
    const sheen = x.createRadialGradient(cx - 70, cy - 90, 20, cx, cy, 260);
    sheen.addColorStop(0, "rgba(190,200,230,0.16)");
    sheen.addColorStop(0.5, "rgba(190,200,230,0.04)");
    sheen.addColorStop(1, "rgba(190,200,230,0)");
    x.fillStyle = sheen;
    x.beginPath();
    x.arc(cx, cy, 256, 0, Math.PI * 2);
    x.fill();
    // Hub — the spool core the film is wound on (中间有胶卷轴)
    x.beginPath();
    x.arc(cx, cy, 96, 0, Math.PI * 2);
    x.fillStyle = "#343442";
    x.fill();
    x.beginPath();
    x.arc(cx, cy, 96, 0, Math.PI * 2);
    x.strokeStyle = "rgba(200,208,230,0.5)";
    x.lineWidth = 4;
    x.stroke();
    // Core slots (like a real 35mm spool)
    x.fillStyle = "#15151d";
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      x.save();
      x.translate(cx + Math.cos(a) * 74, cy + Math.sin(a) * 74);
      x.rotate(a);
      x.fillRect(-9, -14, 18, 28);
      x.restore();
    }
    // Axle hole in the middle of the hub
    x.beginPath();
    x.arc(cx, cy, 34, 0, Math.PI * 2);
    x.fillStyle = "#0a0a10";
    x.fill();
    x.beginPath();
    x.arc(cx, cy, 34, 0, Math.PI * 2);
    x.strokeStyle = "rgba(170,180,205,0.4)";
    x.lineWidth = 3;
    x.stroke();

    const faceTex = new THREE.CanvasTexture(c);
    faceTex.colorSpace = THREE.SRGBColorSpace;

    const discGeo = new THREE.CircleGeometry(1, 64);
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex, roughness: 0.5, metalness: 0.1, side: THREE.FrontSide,
      // Barely-there self-light: the face reads via the side key light,
      // this only keeps it from going pitch black in the shadow turn.
      emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: 0.1
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a24, roughness: 0.55, metalness: 0.08, side: THREE.FrontSide,
      emissive: 0x1a1a24, emissiveIntensity: 0.3
    });

    this.rollGroup = new THREE.Group();
    this.rollGroup.rotation.order = "YXZ";

    this.rollTop = new THREE.Mesh(discGeo, faceMat);
    this.rollTop.rotation.x = -Math.PI / 2;      // faces up the roll's axis
    this.rollBottom = new THREE.Mesh(discGeo, backMat);
    this.rollBottom.rotation.x = Math.PI / 2;

    // Through-spindle: the metal axle the film is wound on, visible at both
    // ends of the roll — the clearest "unopened roll" cue there is.
    const spindle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, COIL_HALF_H * 2 + 0.3, 24),
      new THREE.MeshStandardMaterial({ color: 0x8b8fa0, roughness: 0.35, metalness: 0.75 })
    );

    this.rollGroup.add(this.rollTop, this.rollBottom, spindle);
    this.rollSpindle = spindle;
    this.add(this.rollGroup);
  }

  /**
   * Paper label sticker on the roll's side — like the real sealing label on
   * a fresh roll of film: off-white stock, a punched hole with a reinforced
   * ring, the instructor's name, and a slightly askew stick for realism.
   * Parented to rollGroup, so it spins & shrinks with the roll itself.
   */
  _createLabel() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 192;
    const x = c.getContext("2d");

    // Label stock — muted kraft off-white. Kept deliberately DARKER than a
    // fresh sheet of paper: a bright tag blooms into a featureless glow
    // under the post-processing, and the name becomes unreadable.
    const paper = x.createLinearGradient(0, 0, 0, 192);
    paper.addColorStop(0, "#d6cab0");
    paper.addColorStop(0.5, "#c9bb9c");
    paper.addColorStop(1, "#b3a482");
    x.fillStyle = paper;
    x.fillRect(0, 0, 512, 192);

    // Faint paper fibres
    x.globalAlpha = 0.06;
    for (let i = 0; i < 260; i++) {
      x.strokeStyle = Math.random() > 0.5 ? "#6e6246" : "#efe8d6";
      x.lineWidth = 1;
      const fx = Math.random() * 512, fy = Math.random() * 192;
      x.beginPath();
      x.moveTo(fx, fy);
      x.lineTo(fx + 14 + Math.random() * 22, fy + (Math.random() - 0.5) * 4);
      x.stroke();
    }
    x.globalAlpha = 1;

    // Double border like a printed luggage tag
    x.strokeStyle = "rgba(52,40,22,0.9)";
    x.lineWidth = 5;
    x.strokeRect(10, 10, 492, 172);
    x.lineWidth = 2;
    x.strokeRect(20, 20, 472, 152);

    // Punched hole + reinforcement ring (left side, like a tag you could tie)
    x.beginPath();
    x.arc(62, 96, 25, 0, Math.PI * 2);
    x.strokeStyle = "rgba(52,40,22,0.75)";
    x.lineWidth = 7;
    x.stroke();
    x.beginPath();
    x.arc(62, 96, 13, 0, Math.PI * 2);
    x.fillStyle = "#211a10";
    x.fill();

    // Instructor name — the point of the label: big, dark, unmistakable
    x.textBaseline = "middle";
    x.fillStyle = "#1d1508";
    x.textAlign = "left";
    const zhFont = "'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";
    x.font = `bold 96px ${zhFont}`;
    x.fillText(this.instructor, 116, 82);
    // Caption under the name
    x.font = `600 30px ${zhFont}`;
    x.fillStyle = "rgba(52,40,22,0.9)";
    x.fillText(`讲师 · ${this.courseSet.series}`, 118, 150);
    // Small print on the right
    x.textAlign = "right";
    x.font = "600 22px 'Courier New', monospace";
    x.fillStyle = "rgba(52,40,22,0.6)";
    x.fillText("35MM · COURSE GALLERY", 484, 36);

    const labelTex = new THREE.CanvasTexture(c);
    labelTex.colorSpace = THREE.SRGBColorSpace;

    // Curved tag wrapping part of the roll's outer wrap, facing the camera.
    // Almost no self-light — the scene lights it like real paper. On phones
    // the image-based lighting alone flattens the paper into a white slab,
    // so the label leans on the (pure side) key light there instead.
    const isMobile = window.innerWidth < 768;
    const arc = 1.7; // radians of circumference the label covers
    const geo = new THREE.CylinderGeometry(
      1.02, 1.02, 0.44, 40, 1, true, -arc / 2, arc
    );
    const mat = new THREE.MeshStandardMaterial({
      map: labelTex, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide,
      emissive: 0xffffff, emissiveMap: labelTex,
      emissiveIntensity: isMobile ? 0.04 : 0.06,
      envMapIntensity: isMobile ? 0.35 : 1.0
    });
    const label = new THREE.Mesh(geo, mat);
    label.rotation.z = 0.05;   // stuck on slightly askew, like a real sticker
    this.rollGroup.add(label);
    this.rollLabel = label;
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

  _createStrip(frames) {
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

    this.stripTexture = createFilmStripTexture(frames, {
      contentWFrac: FRAME_WIDTH / STEP,
      contentHFrac: FRAME_HEIGHT / STRIP_H,
      borderFrac: BORDER_H / STRIP_H
    });
    this.stripTexture.repeat.x = this.pathLength / (STEP * this.frameCount);

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
    const R = Math.max(0.1, ROLL_R0 * (1 - this.unroll) + 0.08); // shrinking roll
    const TURNS = ROLL_TURNS;    // a few solid wound layers, like a fresh roll
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
      const radius = Math.max(0.07, R * (1 - layer * ROLL_LAYER_DROP));
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
      // still visible, until the fog dissolves it. (Flat state only — the
      // wound roll keeps a constant width, like a real roll of film.)
      const taper = 1 / (1 + ad * 0.058);
      const hh = halfH * taper;

      // Write both verts; the coiled ones include the strip's half-height
      // along the roll's TILTED axis so the spiral matches the end-face discs
      const bi = (i * 2) * 3;
      const ti = (i * 2 + 1) * 3;
      for (const [idx, s] of [[bi, -1], [ti, 1]]) {
        // coil-local vertex: (sx, s*COIL_HALF_H, sz) tilted about X by TILT_X
        const coilX = rcx + sx;
        const coilY = rcy + (s * COIL_HALF_H) * cosT - sz * sinT;
        const coilZ = rcz + (s * COIL_HALF_H) * sinT + sz * cosT;
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
    // The coiled roll carries a whisper of self-light so it never dies in
    // the dark — but no more than that; the vintage look comes from the
    // side lighting, not from the film glowing like a lamp.
    if (this.strip && this.strip.material) {
      this.strip.material.emissiveIntensity = 0.14 + (1 - this.unroll) * 0.18;
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
        // End faces cap the wound roll exactly at its (constant) width
        const hh = COIL_HALF_H + 0.005;
        this.rollTop.position.y = hh;
        this.rollBottom.position.y = -hh;
      }
    }

    if (this.dust) this.dust.rotation.y += (delta || 0.016) * 0.02;
  }
}
