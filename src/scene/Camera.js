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
   * Fit the camera so the film strip dominates the viewport.
   * Responsive: on mobile/portrait the film fills even more of the screen.
   */
  fit() {
    if (!this.reel) return;

    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const tan = Math.tan(vFov / 2);
    const aspect = this.camera.aspect;

    const isPortrait = aspect < 1;
    const isMobile = window.innerWidth < 768;

    // How much of the viewport the center frame should fill
    // Mobile: much larger so the film dominates the small screen
    let fill;
    // Mobile portrait: enlarge the film so it feels compact and fills the
    // screen instead of floating small with empty space around it.
    if (isMobile && isPortrait) fill = 0.88;
    else if (isPortrait) fill = 0.74;
    else fill = this.fill;

    // The visible strip width (center frame + partial adjacent frames)
    // On mobile show less width (focus on center frame)
    const widthMult = isMobile ? 1.3 : 1.8;
    const w = this.reel.frameWidth * widthMult;
    const h = this.reel.frameHeight + 0.5;
    const tilt = this.reel.tilt || 0;
    const effW = Math.abs(w * Math.cos(tilt)) + Math.abs(h * Math.sin(tilt));
    const effH = Math.abs(w * Math.sin(tilt)) + Math.abs(h * Math.cos(tilt));

    const dH = effH / (fill * 2 * tan);
    const dW = effW / (fill * aspect * 2 * tan);
    this.baseZ = Math.max(dH, dW);

    // Close-up: single frame fills viewport
    const enterFill = isMobile ? 0.98 : this.enterFill;
    const fw = this.reel.frameWidth;
    const fh = this.reel.frameHeight;
    const cH = fh / (enterFill * 2 * tan);
    const cW = fw / (enterFill * aspect * 2 * tan);
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
