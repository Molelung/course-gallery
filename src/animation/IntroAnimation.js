/**
 * IntroAnimation — the film is pulled out of the roll from one end.
 *
 * The reel starts fully coiled (FilmReel.unroll = 0), framed close: pushed
 * toward the camera and shifted so the standing roll reads on the left of
 * the screen. A damped spring drives the peel from the left tail all the
 * way to the right tail while the whole group dollies back to its home
 * pose — so the film streams across the screen and settles into the winding
 * strip in one continuous pull. skipToEnd() fast-forwards (click-to-skip).
 */
export default class IntroAnimation {

  constructor(object) {
    this.object = object;
    this.finished = false;
    this._running = false;

    // Spring state for the unroll
    this.u = 0;
    this.uvel = 0;

    // Opening pose (e = 0): close to the camera, roll framed left-of-center.
    // NOTE: rotation.y must stay small — a large Y-rotation swings the
    // far-left roll off-screen (verified: 0.3 rad pushed it past the edge).
    this.object.visible = true;
    this.object.setUnroll(0);
    this.object.rotation.y = 0.12;
    this.object.position.x = 2.2;
    this.object.position.z = 6.0;
  }

  /** Trigger the pull. */
  begin() {
    if (this._running || this.finished) return;
    this._running = true;
  }

  /** Fast-forward to the fully laid-out state (click-to-skip). */
  skipToEnd() {
    this.finished = true;
    this._running = false;
    this.u = 1;
    this.uvel = 0;
    this.object.setUnroll(1);
    this.object.rotation.y = 0;
    this.object.position.x = 0;
    this.object.position.z = 0;
  }

  update() {
    if (this.finished || !this._running) return;

    // Damped spring toward fully-open — steady pull with a soft settle at
    // the end (film tension), not a bounce.
    this.uvel += (1 - this.u) * 0.042;
    this.uvel *= 0.895;
    this.u += this.uvel;

    // Dolly out & straighten while the film spools across
    const e = this.u;
    this.object.rotation.y = (1 - e) * 0.12;
    this.object.position.x = (1 - e) * 2.2;
    this.object.position.z = (1 - e) * 6.0;

    this.object.setUnroll(this.u);

    if (Math.abs(1 - this.u) < 0.0015 && Math.abs(this.uvel) < 0.0015) {
      this.skipToEnd();
    }
  }
}
