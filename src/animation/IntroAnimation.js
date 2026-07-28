/**
 * IntroAnimation - Film reel flies in from distance on load.
 * Supports being triggered externally (e.g. after splash completes)
 * via begin() / waitFor() pattern for loose coupling.
 */
export default class IntroAnimation {

  constructor(object) {
    this.object = object;
    this.duration = 2.2;
    this.finished = false;
    this._running = false;
    this._startTime = 0;

    // Hide the film until intro begins
    this.object.visible = false;
  }

  /**
   * Wait for an external controller (e.g. SplashAnimation).
   * The intro won't start until begin() is called.
   */
  waitFor(_controller) {
    // The controller's onComplete callback will call begin().
    // This method exists for semantic clarity in main.js.
    this._running = false;
  }

  /** Trigger the intro animation to start now. */
  begin() {
    if (this._running || this.finished) return;
    this._running = true;
    this._startTime = performance.now();
    this.object.visible = true;
  }

  update() {
    if (this.finished || !this._running) return;

    const elapsed = (performance.now() - this._startTime) / 1000;
    const t = Math.min(elapsed / this.duration, 1);

    // Smooth ease-out (quart)
    const ease = 1 - Math.pow(1 - t, 4);

    this.object.position.z = -8 + ease * 8;
    this.object.scale.setScalar(0.4 + ease * 0.6);
    // Slight rotation settle for cinematic feel
    this.object.rotation.y = (1 - ease) * 0.15;

    if (t >= 1) {
      this.finished = true;
      this.object.position.z = 0;
      this.object.scale.setScalar(1);
      this.object.rotation.y = 0;
    }
  }
}
