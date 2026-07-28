import * as THREE from "three";

/**
 * CarouselController - Interaction controller for the film strip
 * Drives a continuous "offset" (in frame units) that slides the strip horizontally.
 * Switching: pointer drag (mouse + touch), arrow buttons, dot jump.
 * A drag release settles on the nearest frame; a quick flick advances exactly one.
 * (The scroll wheel is reserved for entering the detail view, see DetailView.)
 */
export default class CarouselController {

  constructor(reel, options = {}) {
    this.reel = reel;
    this.frameCount = reel.frameCount;

    // Offset state (in frame units)
    this.currentOffset = 0;
    this.targetOffset = 0;
    this.vel = 0; // spring velocity → inertia, elastic bow & settle "collision"

    // Disabled while the detail view is open
    this.enabled = true;

    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartOffset = 0;
    this.lastX = 0;
    this.lastTime = 0;
    this.flick = 0; // release velocity in px/ms (positive = towards next)

    // Config - responsive sensitivity
    const isMobile = window.innerWidth < 768;
    this.dragSensitivity = isMobile ? 0.006 : 0.004; // more sensitive on mobile
    this.flickThreshold = isMobile ? 0.25 : 0.35;   // easier flick on mobile

    // Callback
    this.onFrameChange = options.onFrameChange || null;
    this.lastActiveIndex = 0;

    this.bindEvents();
  }

  bindEvents() {
    // Unified pointer drag (mouse + touch)
    window.addEventListener("pointerdown", (e) => {
      if (!this.enabled) return;
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest("#indicators")) return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartOffset = this.targetOffset;
      this.lastX = e.clientX;
      this.lastTime = performance.now();
      this.flick = 0;
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.isDragging || !this.enabled) return;
      const dx = e.clientX - this.dragStartX;
      // Drag left -> advance to next frame (offset increases)
      this.targetOffset = this.dragStartOffset - dx * this.dragSensitivity;

      const now = performance.now();
      const dt = now - this.lastTime;
      if (dt > 0) this.flick = -(e.clientX - this.lastX) / dt;
      this.lastX = e.clientX;
      this.lastTime = now;
    });

    const release = () => {
      if (this.isDragging && this.enabled) this.settle();
      this.isDragging = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    // Arrow buttons
    const prevBtn = document.querySelector(".nav-prev");
    const nextBtn = document.querySelector(".nav-next");
    if (prevBtn) prevBtn.addEventListener("click", () => this.step(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => this.step(1));
  }

  /**
   * Settle after a drag: snap to the nearest frame; a quick flick that didn't
   * cross the halfway point still advances exactly one frame - never more.
   */
  settle() {
    let target = Math.round(this.targetOffset);
    const startFrame = Math.round(this.dragStartOffset);
    if (target === startFrame && Math.abs(this.flick) > this.flickThreshold) {
      target = startFrame + Math.sign(this.flick);
    }
    this.targetOffset = target;
    // Inertia: a gentle carry of the release velocity — real film glides a
    // little, it doesn't snap back.
    this.vel = THREE.MathUtils.clamp(this.flick * 0.3, -0.32, 0.32);
  }

  /**
   * Advance by whole frames (positive = next).
   */
  step(n) {
    if (!this.enabled) return;
    this.targetOffset = Math.round(this.targetOffset) + n;
  }

  /**
   * Jump to a specific frame index via the shortest wrapped path.
   */
  goToFrame(index) {
    // Programmatic jump — intentionally NOT gated by `enabled`, so the menu
    // and the seamless "next course" flow can move the film while the drag
    // input is disabled inside the detail view.
    const N = this.frameCount;
    let diff = index - this.targetOffset;
    diff = ((diff % N) + N) % N;
    if (diff > N / 2) diff -= N;
    this.targetOffset += diff;
  }

  update() {
    // Spring follow — tuned like film pulled by hand: it glides onto the
    // frame with almost no overshoot, instead of bouncing back elastically.
    const stiffness = 0.058;
    const damping = 0.86;
    this.vel += (this.targetOffset - this.currentOffset) * stiffness;
    this.vel *= damping;
    this.currentOffset += this.vel;
    this.reel.setOffset(this.currentOffset);

    // Elastic bow proportional to travel speed — kept subtle; the reel
    // itself smooths it further into a paper-like wave.
    this.reel.setBend(THREE.MathUtils.clamp(this.vel * 0.4, -0.45, 0.45));

    // Fire frame-change callback
    const activeIndex = this.reel.getActiveIndex();
    if (activeIndex !== this.lastActiveIndex) {
      this.lastActiveIndex = activeIndex;
      if (this.onFrameChange) this.onFrameChange(activeIndex);
    }
  }
}
