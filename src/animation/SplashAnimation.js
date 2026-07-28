/**
 * SplashAnimation - Film reel opening splash screen.
 * Manages the full lifecycle: show → animate → dismiss.
 * Emits a callback when the splash is fully done so the
 * main scene can begin its intro independently.
 */
export default class SplashAnimation {

  /**
   * @param {Object} options
   * @param {number} options.openDelay   - ms before film strips start opening (default 1600)
   * @param {number} options.openDuration - ms for the film-open transition (default 1800)
   * @param {number} options.fadeDuration - ms for final fade-out (default 800)
   * @param {Function} options.onComplete - called when splash is fully dismissed
   */
  constructor(options = {}) {
    this.openDelay = options.openDelay ?? 1600;
    this.openDuration = options.openDuration ?? 1800;
    this.fadeDuration = options.fadeDuration ?? 800;
    this.onComplete = options.onComplete ?? null;

    this.el = document.querySelector("#splash");
    this._done = false;
    this._timers = [];

    if (this.el) {
      this._schedule();
    }
  }

  /** Total time (ms) from init until splash is fully gone. */
  get totalDuration() {
    return this.openDelay + this.openDuration + this.fadeDuration + 200;
  }

  _schedule() {
    const dismissAt = this.openDelay + this.openDuration + 200;

    // Start fade-out
    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-done");
    }, dismissAt));

    // Fully remove from DOM flow
    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-hidden");
      this._done = true;
      if (this.onComplete) this.onComplete();
    }, dismissAt + this.fadeDuration));
  }

  /** Skip the splash immediately. */
  skip() {
    if (this._done || !this.el) return;
    this._timers.forEach(clearTimeout);
    this.el.classList.add("splash-done", "splash-hidden");
    this._done = true;
    if (this.onComplete) this.onComplete();
  }

  destroy() {
    this._timers.forEach(clearTimeout);
    if (this.el) this.el.remove();
  }
}
