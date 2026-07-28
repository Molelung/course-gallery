/**
 * IntroAnimation — the film is pulled out of the roll from one end.
 *
 * Time-based (not a spring — a spring converges in a fraction of a second
 * and reads as a flash): the peel travels the full path over ~2.6s with an
 * easeInOutCubic profile, so the film accelerates gently, streams across
 * the screen, then SLOWS TO A STOP with no overshoot or bounce (慢慢停下).
 * The whole group dollies back to its home pose over the same ease.
 * skipToEnd() fast-forwards (click-to-skip).
 */
export default class IntroAnimation {

  constructor(object) {
    this.object = object;
    this.finished = false;
    this._running = false;

    this.duration = 2600; // ms for the pull
    this._t0 = null;

    // Opening pose (e = 0): group shifted right & toward the camera so the
    // roll (at the strip's far-left tip, local x=-12) sits just inside the
    // left screen edge. rotation stays 0 — any Y-rotation swings the roll
    // off-screen (verified twice).
    this.object.visible = true;
    this.object.setUnroll(0);
    this.object.rotation.y = 0;
    this.object.position.x = 6.9;
    this.object.position.z = 6.5;
  }

  /** Trigger the pull. */
  begin() {
    if (this._running || this.finished) return;
    this._running = true;
    // Portrait phones: the roll & early peel are outside the narrow view —
    // start partway through the ease so the film is already streaming in
    // from the left edge instead of showing an empty screen for ~1.5s.
    const portrait = window.innerWidth < window.innerHeight;
    this._t0 = portrait ? performance.now() - this.duration * 0.35 : null;
  }

  /** Fast-forward to the fully laid-out state (click-to-skip). */
  skipToEnd() {
    this.finished = true;
    this._running = false;
    this.object.setUnroll(1);
    this.object.rotation.y = 0;
    this.object.position.x = 0;
    this.object.position.z = 0;
  }

  update() {
    if (this.finished || !this._running) return;
    if (this._t0 === null) this._t0 = performance.now();

    const raw = (performance.now() - this._t0) / this.duration;
    const t = Math.min(1, Math.max(0, raw));
    // easeInOutCubic: slow start, steady middle, slow stop — no overshoot
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    this.object.rotation.y = 0;
    this.object.position.x = (1 - e) * 6.9;
    this.object.position.z = (1 - e) * 6.5;
    this.object.setUnroll(e);

    if (t >= 1) this.skipToEnd();
  }
}
