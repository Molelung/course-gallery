import * as THREE from "three";

/**
 * DetailView - "Enter the frame" experience, like the reference site.
 * Scroll wheel (down) or clicking the active frame zooms the camera into the
 * current frame and reveals an HTML detail overlay. Scroll up, the back
 * button or Escape returns to the carousel.
 * Clicking a side frame brings it to the center instead.
 */
export default class DetailView {

  constructor(cameraWrapper, reel, carousel, frameData) {
    this.cameraWrapper = cameraWrapper;
    this.camera = cameraWrapper.camera;
    this.reel = reel;
    this.carousel = carousel;
    this.frameData = frameData;

    this.active = false;
    this.t = 0;        // 0 = carousel, 1 = detail close-up
    this.wheelAcc = 0; // accumulated wheel delta with decay

    // Tap detection / raycasting
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.downX = 0;
    this.downY = 0;
    this.downTime = 0;

    this.bindEvents();
  }

  bindEvents() {
    // Wheel: scroll down enters the active frame, scroll up leaves it
    window.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.wheelAcc += e.deltaY;
      if (!this.active && this.wheelAcc > 80) {
        this.enter();
        this.wheelAcc = 0;
      } else if (this.active && this.wheelAcc < -80) {
        this.exit();
        this.wheelAcc = 0;
      }
    }, { passive: false });

    // Touch swipe: vertical swipe enters/exits detail (mobile)
    this._touchStartY = 0;
    this._touchStartX = 0;
    this._touchStartTime = 0;

    window.addEventListener("touchstart", (e) => {
      this._touchStartY = e.touches[0].clientY;
      this._touchStartX = e.touches[0].clientX;
      this._touchStartTime = performance.now();
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      const dy = e.changedTouches[0].clientY - this._touchStartY;
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dt = performance.now() - this._touchStartTime;

      // Only trigger if vertical swipe is dominant and quick enough
      if (Math.abs(dy) < 50 || Math.abs(dy) < Math.abs(dx) * 1.2 || dt > 500) return;

      if (!this.active && dy < 0) {
        // Swipe up -> enter detail
        this.enter();
      } else if (this.active && dy > 0) {
        // Swipe down -> exit detail
        this.exit();
      }
    }, { passive: true });

    // Tap (press + release without moving) -> raycast into the strip
    window.addEventListener("pointerdown", (e) => {
      this.downX = e.clientX;
      this.downY = e.clientY;
      this.downTime = performance.now();
    });

    window.addEventListener("pointerup", (e) => {
      if (this.active) return;
      const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
      if (moved > 6 || performance.now() - this.downTime > 400) return;
      if (e.target.closest("button") || e.target.closest("#indicators")) return;
      this.handleTap(e.clientX, e.clientY);
    });

    // Back button + Escape
    const back = document.querySelector("#detail-back");
    if (back) back.addEventListener("click", () => this.exit());
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.exit();
    });
  }

  handleTap(x, y) {
    this.pointer.x = (x / window.innerWidth) * 2 - 1;
    this.pointer.y = -(y / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObject(this.reel.strip, false);
    if (!hits.length || !hits[0].uv) return;

    const index = this.reel.frameIndexFromUV(hits[0].uv);
    if (index === this.reel.getActiveIndex()) {
      this.enter();
    } else {
      this.carousel.goToFrame(index);
    }
  }

  enter() {
    if (this.active) return;
    this.active = true;
    this.carousel.enabled = false;

    // Fill the overlay with the active module's data
    const data = this.frameData[this.reel.getActiveIndex()];
    document.querySelector("#detail-title").textContent = data.title;
    document.querySelector("#detail-subtitle").textContent = data.subtitle;
    document.querySelector("#detail-desc").textContent = data.desc || "";
    document.querySelector("#detail-tags").textContent = data.tags || "";
    const linkEl = document.querySelector("#detail-link");
    if (data.link) {
      linkEl.href = data.link;
      linkEl.style.display = "inline-block";
    } else {
      linkEl.style.display = "none";
    }

    document.body.classList.add("detail-mode");
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.carousel.enabled = true;
    document.body.classList.remove("detail-mode");
  }

  update() {
    // Smooth zoom transition
    const target = this.active ? 1 : 0;
    this.t += (target - this.t) * 0.07;
    if (Math.abs(target - this.t) < 0.001) this.t = target;

    this.cameraWrapper.setZoom(this.t);

    // Straighten the diagonal strip while entering the frame
    this.reel.rotation.z = this.reel.tilt * (1 - this.t);

    // Let unfinished wheel gestures fade away
    this.wheelAcc *= 0.92;
  }
}
