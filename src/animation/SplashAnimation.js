import { getDefaultFrames } from "../utils/CanvasTexture.js";

/**
 * SplashAnimation — the film scroll is pulled open.
 *
 * Act 1 (0 → holdDuration): two film curtains cover the screen — real film,
 * sprocket holes and course frames — with the title card floating on top.
 * Act 2 (the pull): the curtains are dragged apart like a scroll being
 * unrolled, a curled roll-edge collecting on each side; at the same instant
 * onComplete fires so the coiled 3D reel behind begins to unroll — one
 * continuous "the film is being pulled open" motion across 2D and 3D.
 * Act 3 (fadeDuration later): the overlay fades out and leaves the DOM.
 */
export default class SplashAnimation {

  /**
   * @param {Object} options
   * @param {number} options.holdDuration - ms before the pull starts (default 1500)
   * @param {number} options.pullDuration - ms for the curtain pull (default 1700)
   * @param {number} options.fadeDuration - ms for the final fade (default 800)
   * @param {Function} options.onComplete - called the moment the pull begins
   */
  constructor(options = {}) {
    this.holdDuration = options.holdDuration ?? 1500;
    this.pullDuration = options.pullDuration ?? 1700;
    this.fadeDuration = options.fadeDuration ?? 800;
    this.onComplete = options.onComplete ?? null;

    this.el = document.querySelector("#splash");
    this._done = false;
    this._timers = [];

    if (this.el) {
      this._buildCurtains();
      this._schedule();
    }
  }

  /** Total time (ms) from init until splash is fully gone. */
  get totalDuration() {
    return this.holdDuration + this.pullDuration + this.fadeDuration + 100;
  }

  /** Fill the curtain halves with mini course frames from real frame data. */
  _buildCurtains() {
    const frames = getDefaultFrames();
    const left = document.querySelector("#curtain-frames-left");
    const right = document.querySelector("#curtain-frames-right");
    if (!left || !right) return;

    // 4 cells per curtain, taken from alternating courses
    for (let i = 0; i < 8; i++) {
      const f = frames[i % frames.length];
      const cell = document.createElement("div");
      cell.className = "curtain-frame";
      cell.style.background =
        `linear-gradient(135deg, ${f.colorA} 0%, ${f.colorB} 100%)`;
      const label = document.createElement("span");
      label.textContent = f.title;
      cell.appendChild(label);
      (i % 2 === 0 ? left : right).appendChild(cell);
    }
  }

  _schedule() {
    // Act 2 — the pull: curtains apart, title dissolves, 3D unroll begins
    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-open");
      if (this.onComplete) this.onComplete();
    }, this.holdDuration));

    // Act 3 — fade the whole overlay once the pull has mostly finished
    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-done");
    }, this.holdDuration + this.pullDuration));

    this._timers.push(setTimeout(() => {
      this.el.classList.add("splash-hidden");
      this._done = true;
    }, this.holdDuration + this.pullDuration + this.fadeDuration));
  }

  /** Skip the splash immediately. */
  skip() {
    if (this._done || !this.el) return;
    this._timers.forEach(clearTimeout);
    this.el.classList.add("splash-open", "splash-done", "splash-hidden");
    this._done = true;
    if (this.onComplete) this.onComplete();
  }

  destroy() {
    this._timers.forEach(clearTimeout);
    if (this.el) this.el.remove();
  }
}
