/**
 * IntroAnimation — the opening choreography (no title card):
 *
 *   Act 1 (0.5s)   the loader's breathing dot fades, revealing the film
 *                  roll sitting at the CENTRE of the screen
 *   Act 2 (1.3s)   the roll drifts slowly to the LEFT side of the screen
 *   Act 3 (4.4s)   the film is pulled out of the roll, streaming across the
 *                  screen to form the winding strip, slowing to a stop with
 *                  no overshoot (easeInOutCubic — 慢慢停下)
 *
 * Time-based (springs converge in a flash). Poses are aspect-aware so the
 * roll stays visible on narrow portrait phones as well as desktop.
 * skipToEnd() fast-forwards (click-to-skip).
 */
export default class IntroAnimation {

  constructor(object) {
    this.object = object;
    this.finished = false;
    this._running = false;

    this.appearDur = 500;
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
   * Roll local position ≈ (-12, -1.3, -9.55) — the strip's left tip.
   * Group pose = desired roll world position minus that local offset.
   * Desktop camera z≈6.2 / portrait z≈10 — poses are computed per aspect
   * so the roll is framed on-screen on every device.
   */
  _computePoses() {
    const portrait = window.innerWidth < window.innerHeight;
    // Act 1: roll at screen centre, close & present
    this.poseA = portrait ? { x: 12.0, y: 1.1, z: 13.0 }
                          : { x: 11.5, y: 1.1, z: 10.0 };
    // Act 2 end: roll at the left edge, ready to unroll across
    this.poseB = portrait ? { x: 10.3, y: 0.4, z: 10.5 }
                          : { x: 6.9, y: 0.0, z: 6.5 };
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

  /** Trigger the opening sequence. */
  begin() {
    if (this._running || this.finished) return;
    this._computePoses(); // re-check aspect in case of rotation/resize
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
    if (this.finished || !this._running) return;
    if (this._t0 === null) this._t0 = performance.now();

    const now = performance.now() - this._t0;
    const T1 = this.appearDur;
    const T2 = T1 + this.travelDur;
    const T3 = T2 + this.pullDur;
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    if (now < T1) {
      // Act 1 — hold the roll at centre
      this._applyPose(this.poseA);
      this.object.setUnroll(0);
      return;
    }

    if (now < T2) {
      // Act 2 — drift to the left edge
      const e = ease((now - T1) / this.travelDur);
      this._lerpPose(this.poseA, this.poseB, e);
      this.object.setUnroll(0);
      return;
    }

    // Act 3 — the pull: unroll + dolly home over the same slow ease
    const e = ease(Math.min(1, (now - T2) / this.pullDur));
    this._lerpPose(this.poseB, { x: 0, y: 0, z: 0 }, e);
    this.object.setUnroll(e);

    if (e >= 1) this.skipToEnd();
  }
}
