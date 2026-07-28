import * as THREE from "three";
import { createFilmStripTexture, getDefaultFrames } from "../utils/CanvasTexture.js";
import createDust from "./DustParticles.js";

// ---- Film strip parameters ----
const FRAME_COUNT = 6;
const FRAME_WIDTH = 2.4;          // visible content width
const FRAME_HEIGHT = 1.5;         // visible content height
const BORDER_H = 0.24;            // perforated edge height (top / bottom)
const STEP = FRAME_WIDTH + 0.12;  // one frame tile length along the strip
const STRIP_H = FRAME_HEIGHT + BORDER_H * 2;
const STRIP_THICKNESS = 0.025;    // physical thickness of the film band
const TILT = -0.08;               // slight diagonal tilt of the whole scene

// The stream path: one long HORIZONTAL film band that flows across the whole
// width of the screen and gently meanders like a stream.
const PATH_POINTS = [
  new THREE.Vector3(-7.2, 0.55, -3.4),
  new THREE.Vector3(-4.6, 0.05, -1.5),
  new THREE.Vector3(-2.3, -0.30, -0.45),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(2.4, 0.30, -0.45),
  new THREE.Vector3(4.6, 0.05, -1.5),
  new THREE.Vector3(7.2, 0.55, -3.4)
];
const SEGMENTS = 320;

export default class FilmReel extends THREE.Group {

  constructor() {
    super();

    this.frameCount = FRAME_COUNT;
    this.frameWidth = FRAME_WIDTH;
    this.frameHeight = FRAME_HEIGHT;
    this.tilt = TILT;

    this.offset = 0; // continuous scroll offset (in frame units)

    this.rotation.z = TILT;

    this.curve = new THREE.CatmullRomCurve3(PATH_POINTS);
    this.pathLength = this.curve.getLength();
    this.sCenter = this._findCenterArcLength();

    this.createStrip();

    this.dust = createDust();
    this.add(this.dust);

    this.setOffset(0);
  }

  /**
   * Arc length of the curve point closest to the origin (the active anchor).
   */
  _findCenterArcLength() {
    let bestU = 0;
    let bestD = Infinity;
    const p = new THREE.Vector3();
    for (let i = 0; i <= 400; i++) {
      const u = i / 400;
      this.curve.getPointAt(u, p);
      const d = p.lengthSq();
      if (d < bestD) { bestD = d; bestU = u; }
    }
    return bestU * this.pathLength;
  }

  /**
   * Build the single continuous ribbon that follows the stream curve.
   * Includes a front face, back face, and edge thickness for realism.
   */
  createStrip() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const colors = [];
    const indices = [];

    const up = new THREE.Vector3(0, 1, 0);
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const half = new THREE.Vector3();
    const L = this.pathLength;
    const thick = STRIP_THICKNESS;

    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS;
      const s = u * L;

      this.curve.getPointAt(u, point);
      this.curve.getTangentAt(u, tangent);
      normal.crossVectors(tangent, up).normalize();
      half.copy(up).multiplyScalar(STRIP_H / 2);

      // Front face: bottom vertex, then top vertex
      const fz = thick / 2;
      positions.push(point.x - half.x, point.y - half.y, point.z - half.z + fz);
      positions.push(point.x + half.x, point.y + half.y, point.z + half.z + fz);
      normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
      uvs.push(u, 0, u, 1);

      // Depth-based lighting: center is brightest
      const ds = Math.abs(s - this.sCenter);
      const t = THREE.MathUtils.smoothstep(ds, STEP * 0.4, STEP * 2.0);
      const b = 1 - t * 0.85;
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

    // One long strip texture (6 tiles) that flows along the ribbon
    this.stripTexture = createFilmStripTexture(getDefaultFrames(), {
      contentWFrac: FRAME_WIDTH / STEP,
      contentHFrac: FRAME_HEIGHT / STRIP_H,
      borderFrac: BORDER_H / STRIP_H
    });
    this.stripTexture.repeat.x = this.pathLength / (STEP * FRAME_COUNT);

    // Realistic film material: slightly glossy, low metalness
    const material = new THREE.MeshStandardMaterial({
      map: this.stripTexture,
      vertexColors: true,
      roughness: 0.38,
      metalness: 0.05,
      side: THREE.FrontSide,
      envMapIntensity: 0.6
    });

    this.strip = new THREE.Mesh(geometry, material);
    this.add(this.strip);

    // Back face (dark matte)
    this._createBackFace();
  }

  /** Dark back side of the film strip for realism when viewed at angles. */
  _createBackFace() {
    const positions = [];
    const normals = [];
    const indices = [];

    const up = new THREE.Vector3(0, 1, 0);
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const half = new THREE.Vector3();
    const L = this.pathLength;
    const thick = STRIP_THICKNESS;

    for (let i = 0; i <= SEGMENTS; i++) {
      const u = i / SEGMENTS;
      this.curve.getPointAt(u, point);
      this.curve.getTangentAt(u, tangent);
      normal.crossVectors(tangent, up).normalize();
      half.copy(up).multiplyScalar(STRIP_H / 2);

      const bz = -thick / 2;
      positions.push(point.x - half.x, point.y - half.y, point.z - half.z + bz);
      positions.push(point.x + half.x, point.y + half.y, point.z + half.z + bz);
      normals.push(-normal.x, -normal.y, -normal.z, -normal.x, -normal.y, -normal.z);

      if (i < SEGMENTS) {
        const a = i * 2;
        // Winding reversed for back face
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0e,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.FrontSide
    });

    this.add(new THREE.Mesh(geo, mat));
  }

  /**
   * Slide the film along the stream: the texture flows over the fixed ribbon,
   * so advancing pulls new frames in from the background toward the center.
   */
  setOffset(offset) {
    this.offset = offset;
    const N = this.frameCount;
    this.stripTexture.offset.x =
      (offset + 0.5) / N - this.sCenter / (STEP * N);
  }

  /**
   * Frame index shown at a given ribbon UV (used for click raycasting).
   */
  frameIndexFromUV(uv) {
    const N = this.frameCount;
    let x = (uv.x * this.stripTexture.repeat.x + this.stripTexture.offset.x) % 1;
    if (x < 0) x += 1;
    return Math.floor(x * N) % N;
  }

  /**
   * Index of the frame currently at the front-center anchor.
   */
  getActiveIndex() {
    return ((Math.round(this.offset) % this.frameCount) + this.frameCount) % this.frameCount;
  }

  update(elapsed, delta) {
    // Gentle drift of the dust field
    if (this.dust) {
      this.dust.rotation.y += (delta || 0.016) * 0.02;
    }
  }
}
