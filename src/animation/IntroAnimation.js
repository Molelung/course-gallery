import * as THREE from "three";

/**
 * IntroAnimation — the opening choreography (user-triggered, reversible):
 *
 *   armed        after loading, the roll sits DEAD CENTRE on screen with a
 *                gentle idle bob, waiting — a hint asks for a click
 *   opening      Act 1 (1.3s): the roll drifts slowly to the LEFT edge
 *                Act 2 (4.4s): the film is pulled out of the roll, streaming
 *                across the screen (easeInOutCubic — 慢慢停下)
 *   done         the strip lies flat; carousel input is enabled
 *   rewinding    long-press on the laid film: the exact reverse — the film
 *                winds back onto the roll (2.4s), then the roll drifts home
 *                (1.1s) and the piece is armed again, ready to re-open.
 *
 * Centring is EXACT on every device / aspect ratio:
 *   1. the roll's local anchor (film.rollLocal) is rotated by the group's
 *      constant z-tilt first — forgetting that tilt used to leave the roll
 *      ~0.4 world units too high ("从来都不居中，太过偏上");
 *   2. the centred target is the point on the camera's view axis at a fixed
 *      distance, derived from the live camera (fov, fit distance), so it
 *      reads the centre smartly instead of assuming one.
 */
export default class IntroAnimation {

  constructor(object, cameraWrapper) {
    this.object = object;
    this.cameraWrapper = cameraWrapper;
    this.mode = "armed";          // armed | opening | done | rewinding

    this.travelDur = 1300;
    this.pullDur = 4400;
    this.rewindPullDur = 2400;    // winding back is brisker than the pull-out
    this.rewindHomeDur = 1100;    // the roll then drifts back to centre
    this._t0 = null;

    this.onRewound = null;        // fired once the roll is home & armed again

    this.object.visible = true;
    this.object.setUnroll(0);
    this.object.rotation.y = 0;

    this.poseHome = { x: 0, y: 0, z: 0 };
    this._computePoses();
    this._applyPose(this.poseA);
  }

  /** Laid flat & browsable. (Read-only flag — drive with begin/skip/rewind.) */
  get finished() { return this.mode === "done"; }

  /**
   * Group pose = desired roll world position − the roll's local anchor,
   * with the anchor pre-rotated by the group's constant z-tilt. Roll world
   * targets come from the actual camera (distance, fov, aspect), so
   * centring and edge placement are exact on any device.
   */
  _computePoses() {
    const cam = this.cameraWrapper.camera;
    const camZ = this.cameraWrapper.baseZ;
    const fovTan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

    // The group carries a constant z-tilt (FilmReel.TILT ≈ -8°). The local
    // anchor must be rotated by it too — otherwise the big X offset (-12)
    // leaks into Y and the roll lands far above centre on every screen.
    const rl = this.object.rollLocal.clone().applyEuler(this.object.rotation);

    // Armed pose: dead centre = the point on the camera's view axis at
    // distance dA, computed from the camera's real pose.
    const dA = 4.6;
    const camPos = new THREE.Vector3(cam.position.x, cam.position.y, camZ);
    const viewAxis = new THREE.Vector3(0, 0, 0).sub(camPos).normalize();
    const centre = camPos.clone().addScaledVector(viewAxis, dA);
    this.poseA = {
      x: centre.x - rl.x,
      y: centre.y - rl.y,
      z: centre.z - rl.z
    };

    // Act-1 end pose: roll at the left edge (72% out), further back
    const dB = 9.2;
    const halfWB = fovTan * dB * cam.aspect;
    this.poseB = {
      x: (-halfWB * 0.72) - rl.x,
      y: -0.5 - rl.y,
      z: (camZ - dB) - rl.z
    };

    // Parked pose: the OTHER instructor's roll waits here — peeking in from
    // the right edge, slightly lower & further back, hinting it's swipeable.
    const halfWA = fovTan * dA * cam.aspect;
    this.posePark = {
      x: (halfWA * 0.62) - rl.x,
      y: centre.y - 0.12 - rl.y,
      z: (camZ - dA - 1.4) - rl.z
    };
    // Off-screen left: where the incoming roll starts on a right-swipe,
    // and where the outgoing roll exits on a left-swipe.
    this.poseOffL = {
      x: (-halfWA * 0.62) - rl.x,
      y: this.posePark.y,
      z: this.posePark.z
    };
    // Fully off-screen right: the parked roll retreats here while the
    // active roll is unrolled (done / opening).
    this.poseOffR = {
      x: (halfWA * 1.5) - rl.x,
      y: this.posePark.y,
      z: this.posePark.z
    };
  }

  /**
   * Point the intro at another reel (both reels share identical geometry,
   * so the poses computed above stay valid). Applies the current mode's
   * canonical pose to the newly attached reel.
   */
  attach(film) {
    this.object = film;
    if (this.mode === "armed") this._applyPose(this.poseA);
    else if (this.mode === "done") {
      film.setUnroll(1);
      film.rotation.y = 0;
      film.position.set(0, 0, 0);
    }
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

  /** Trigger the opening sequence (called by the user's click while armed). */
  begin() {
    if (this.mode !== "armed") return;
    this._computePoses(); // re-check camera/aspect in case of resize
    this.mode = "opening";
    this._t0 = null; // stamped on the first update
  }

  /** Fast-forward to the fully laid-out state (click-to-skip). */
  skipToEnd() {
    this.mode = "done";
    this._t0 = null;
    this.object.setUnroll(1);
    this.object.rotation.y = 0;
    this.object.position.set(0, 0, 0);
  }

  /** Long-press on the laid film: wind everything back onto the roll. */
  rewind() {
    if (this.mode !== "done") return;
    this._computePoses(); // re-check camera/aspect in case of resize
    this.mode = "rewinding";
    this._t0 = null;
  }

  update() {
    if (this.mode === "done") return;

    // Armed idle: a slow, gentle bob so the roll feels alive while waiting.
    // `suspended` freezes this while main.js runs a reel-switch tween.
    if (this.mode === "armed") {
      if (this.suspended) return;
      const bob = Math.sin(performance.now() * 0.0012) * 0.06;
      this.object.position.set(this.poseA.x, this.poseA.y + bob, this.poseA.z);
      return;
    }

    if (this._t0 === null) this._t0 = performance.now();
    const now = performance.now() - this._t0;
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // --- Rewinding: the pull played backwards, then the roll drifts home ---
    if (this.mode === "rewinding") {
      const RP = this.rewindPullDur;
      const RH = this.rewindHomeDur;

      if (now < RP) {
        // The laid film feeds back onto the roll as the group backs out
        const e = ease(now / RP);
        this._lerpPose(this.poseHome, this.poseB, e);
        this.object.setUnroll(1 - e);
        return;
      }
      if (now < RP + RH) {
        // Fully wound — the closed roll travels back to dead centre
        const e = ease((now - RP) / RH);
        this._lerpPose(this.poseB, this.poseA, e);
        this.object.setUnroll(0);
        return;
      }
      this.mode = "armed";
      this._t0 = null;
      this.object.setUnroll(0);
      this._applyPose(this.poseA);
      if (this.onRewound) this.onRewound();
      return;
    }

    // --- Opening ---
    const T2 = this.travelDur;

    if (now < T2) {
      // Act 1 — drift to the left edge
      const e = ease(now / this.travelDur);
      this._lerpPose(this.poseA, this.poseB, e);
      this.object.setUnroll(0);
      return;
    }

    // Act 2 — the pull: unroll + dolly home over the same slow ease
    const e = ease(Math.min(1, (now - T2) / this.pullDur));
    this._lerpPose(this.poseB, this.poseHome, e);
    this.object.setUnroll(e);

    if (e >= 1) this.skipToEnd();
  }
}
