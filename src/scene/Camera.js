import * as THREE from "three";
import { CONFIG } from "../config.js";

export default class Camera {

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA.FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA.NEAR,
      CONFIG.CAMERA.FAR
    );

    this.camera.position.set(
      CONFIG.CAMERA.POSITION.x,
      CONFIG.CAMERA.POSITION.y,
      CONFIG.CAMERA.POSITION.z
    );
    this.camera.lookAt(0, 0, 0);

    this.reel = null;
    // Fraction of the smaller viewport dimension the active frame should fill
    this.fill = CONFIG.CAMERA.FILL || 0.6;
    // Close-up fill used by the detail view
    this.enterFill = 0.94;

    // Zoom state: 0 = carousel view, 1 = detail close-up
    this.zoomT = 0;
    this.baseZ = CONFIG.CAMERA.POSITION.z;
    this.closeZ = CONFIG.CAMERA.POSITION.z;
  }

  /**
   * Attach the film strip so the camera can fit it responsively.
   */
  attach(reel) {
    this.reel = reel;
    this.fit();
  }

  /**
   * Pull the camera back just enough that the active frame always fits the
   * viewport (with margin) on any aspect ratio, so nothing overflows and the
   * strip scales with the device.
   * On portrait / mobile screens, use a larger fill so the film dominates.
   */
  fit() {
    if (!this.reel) return;

    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const tan = Math.tan(vFov / 2);
    const aspect = this.camera.aspect;

    // Responsive fill: on narrow portrait screens, fill more of the viewport
    const isPortrait = aspect < 1;
    const fill = isPortrait ? 0.72 : this.fill;

    // Effective size of a tilted frame's bounding box
    const w = this.reel.frameWidth;
    const h = this.reel.frameHeight;
    const tilt = this.reel.tilt || 0;
    const effW = Math.abs(w * Math.cos(tilt)) + Math.abs(h * Math.sin(tilt));
    const effH = Math.abs(w * Math.sin(tilt)) + Math.abs(h * Math.cos(tilt));

    // Distance needed to fit width and height at the target fill fraction
    const dH = effH / (fill * 2 * tan);
    const dW = effW / (fill * aspect * 2 * tan);
    this.baseZ = Math.max(dH, dW);

    // Close-up distance (strip is straightened in detail view, so no tilt)
    const enterFill = isPortrait ? 0.98 : this.enterFill;
    const cH = h / (enterFill * 2 * tan);
    const cW = w / (enterFill * aspect * 2 * tan);
    this.closeZ = Math.max(cH, cW);

    this._apply();
    this.camera.updateProjectionMatrix();
  }

  /**
   * Blend between the fitted distance and the close-up distance (0..1).
   */
  setZoom(t) {
    this.zoomT = t;
    this._apply();
  }

  _apply() {
    this.camera.position.z = this.baseZ + (this.closeZ - this.baseZ) * this.zoomT;
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.fit();
  }
}
