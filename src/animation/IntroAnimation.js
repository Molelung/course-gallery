/**
 * IntroAnimation — the film physically unrolls.
 *
 * The reel starts as a coiled roll (FilmReel.unroll = 0) and a damped spring
 * peels it open into the full winding strip. A slight overshoot at the end
 * makes the unroll feel like real film settling under tension rather than a
 * linear tween. Triggered externally (after the splash title fades) via
 * begin() / waitFor() for loose coupling.
 */
export default class IntroAnimation {

  constructor(object) {
    this.object = object;
    this.finished = false;
    this._running = false;

    // Spring state for the unroll
    this.u = 0;
    this.uvel = 0;

    // Show the reel immediately (as a coiled roll) — the splash title sits
    // on top and fades away to reveal it.
    this.object.visible = true;
    this.object.setUnroll(0);
  }

  /** Wait for an external controller (e.g. SplashAnimation). */
  waitFor(_controller) {
    this._running = false;
  }

  /** Trigger the unroll. */
  begin() {
    if (this._running || this.finished) return;
    this._running = true;
  }

  update() {
    if (this.finished || !this._running) return;

    // Damped spring toward fully-open — slow enough to read as a hand
    // pulling the leader out of the roll; the small overshoot at the end is
    // the film settling under tension, like paper, not a bounce.
    this.uvel += (1 - this.u) * 0.038;
    this.uvel *= 0.9;
    this.u += this.uvel;

    // Cinematic entrance: drift in & straighten while it unrolls
    const e = this.u;
    this.object.rotation.y = (1 - e) * 0.35;
    this.object.position.z = (1 - e) * -2.0;

    this.object.setUnroll(this.u);

    if (Math.abs(1 - this.u) < 0.0015 && Math.abs(this.uvel) < 0.0015) {
      this.finished = true;
      this.object.setUnroll(1);
      this.object.rotation.y = 0;
      this.object.position.z = 0;
    }
  }
}
