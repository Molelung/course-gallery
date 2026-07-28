/**
 * SplashAnimation — pure-3D film pull-open.
 *
 * The overlay is transparent: the coiled 3D film roll behind it is the
 * splash visual. Only a glass title card floats on top.
 *
 * Act 1 (0 → holdDuration): title card over the coiled roll.
 * Act 2 (the pull): card + vignette dissolve; onComplete fires so the 3D
 * reel starts spooling out from one end across the screen.
 * Act 3: the overlay fades out and leaves the DOM.
 *
 * Click anywhere to skip — onSkip fast-forwards the 3D intro to the end.
 */
export default class SplashAnimation {

  /**
   * @param {Object} options
   * @param {number} options.holdDuration - ms before the pull starts (default 1200)
   * @param {number} options.pullDuration - ms for the 3D pull (default 2200)
   * @param {number} options.fadeDuration - ms for the final fade (default 600)
   * @param {Function} options.onComplete - called the moment the pull begins
   * @param {Function} options.onSkip - called when the user clicks to skip
   */
  constructor(options = {}) {
    this.holdDuration = options.holdDuration ?? 1200;
    this.pullDuration = options.pullDuration ?? 2200;
    this.fadeDuration = options.fadeDuration ?? 600;
    this.onComplete = options.onComplete ?? null;
    this.onSkip = options.onSkip ?? null;

    this.el = document.querySelector("#splash");
    this._done = false;
    this._timers = [];

    if (this.el) {
      this.el.addEventListener("click", () => this.skip());
      this._schedule();
    }
  }

  /** Total time (ms) from init until splash is fully gone. */
  get totalDuration() {
    return this.holdDuration + this.pullDuration + this.fadeDuration + 100;
  }

  _schedule() {
    // Act 2 — the pull: card dissolves, 3D spool-out begins
    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-open");
      if (this.onComplete) this.onComplete();
    }, this.holdDuration));

    // Act 3 — fade the overlay once the pull has mostly finished
    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-done");
    }, this.holdDuration + this.pullDuration));

    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-hidden");
      this._done = true;
    }, this.holdDuration + this.pullDuration + this.fadeDuration));
  }

  /** Skip immediately: hide the overlay and fast-forward the 3D intro. */
  skip() {
    if (this._done || !this.el) return;
    this._timers.forEach(clearTimeout);
    this.el.classList.add("splash-open", "splash-done", "splash-hidden");
    this._done = true;
    if (this.onSkip) this.onSkip();
    else if (this.onComplete) this.onComplete();
  }

  destroy() {
    this._timers.forEach(clearTimeout);
    if (this.el) this.el.remove();
  }
}
