import * as THREE from "three";

/**
 * IntroAnimation — the opening choreography (user-triggered, not autoplay):
 *
 *   ARMED          after loading, the roll sits DEAD CENTRE on screen with
 *                  a gentle idle bob, waiting — a hint asks for a click
 *   Act 1 (1.3s)   on click: the roll drifts slowly to the LEFT edge
 *   Act 2 (4.4s)   the film is pulled out of the roll, streaming across the
 *                  screen into the winding strip, slowing to a stop with no
 *                  overshoot (easeInOutCubic — 慢慢停下)
 *   Click again during the acts to skip straight to the laid-out strip.
 *
 * Centring is EXACT: the group pose is computed from the roll's local
 * position (film.rollLocal) and the camera, so the roll sits at world
 * (0,0,·) on every device / aspect ratio.
 */
export default class IntroAnimation {

  constructor(object, cameraWrapper) {
    this.object = object;
    this.cameraWrapper = cameraWrapper;
    this.finished = false;
    this._running = false;

    this.travelDur = 1300;
    this.pullDur = 4400;
    this._t0 = null;

    this.object.visible = true;
    this.object.setUnroll(0);
    this.object.rotation.y = 0;

    this._computePoses();
    this._applyPose(this.poseA);
  }

  /**
   * Group pose = desired roll world position − the roll's local position.
   * Roll world targets are derived from the actual camera (distance, fov,
   * aspect), so centring and edge placement are exact on any device.
   */
  _computePoses() {
    const cam = this.cameraWrapper.camera;
    const camZ = this.cameraWrapper.baseZ;
    const fovTan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const rl = this.object.rollLocal;

    // Armed pose: roll dead-centre, close & present
    const dA = 4.6;
    this.poseA = {
      x: 0 - rl.x,
      y: -0.05 - rl.y,
      z: (camZ - dA) - rl.z
    };

    // Act-1 end pose: roll at the left edge (72% out), further back
    const dB = 9.2;
    const halfWB = fovTan * dB * cam.aspect;
    this.poseB = {
      x: (-halfWB * 0.72) - rl.x,
      y: -0.5 - rl.y,
      z: (camZ - dB) - rl.z
    };
  }

  _applyPose(p) {
    this.object.position.set(p.x, p.y, p.z);
  }

  _lerpPose(a, b, e) {
    this.object.position.set(
      a.x + (b.x - a.x) * e,
      a.y + (b.y - a.y) * e,
      a.z + (b.z - a.z) * e
    );
  }

  /** Trigger the sequence (called by the user's first click). */
  begin() {
    if (this._running || this.finished) return;
    this._computePoses(); // re-check camera/aspect in case of resize
    this._running = true;
    this._t0 = null; // armed; stamped on the first update
  }

  /** Fast-forward to the fully laid-out state (click-to-skip). */
  skipToEnd() {
    this.finished = true;
    this._running = false;
    this.object.setUnroll(1);
    this.object.rotation.y = 0;
    this.object.position.set(0, 0, 0);
  }

  update() {
    if (this.finished) return;

    // Armed idle: a slow, gentle bob so the roll feels alive while waiting
    if (!this._running) {
      const bob = Math.sin(performance.now() * 0.0012) * 0.06;
      this.object.position.set(this.poseA.x, this.poseA.y + bob, this.poseA.z);
      return;
    }

    if (this._t0 === null) this._t0 = performance.now();
    const now = performance.now() - this._t0;
    const T2 = this.travelDur;
    const T3 = T2 + this.pullDur;
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    if (now < T2) {
      // Act 1 — drift to the left edge
      const e = ease(now / this.travelDur);
      this._lerpPose(this.poseA, this.poseB, e);
      this.object.setUnroll(0);
      return;
    }

    // Act 2 — the pull: unroll + dolly home over the same slow ease
    const e = ease(Math.min(1, (now - T2) / this.pullDur));
    this._lerpPose(this.poseB, { x: 0, y: 0, z: 0 }, e);
    this.object.setUnroll(e);

    if (e >= 1) this.skipToEnd();
  }
}
