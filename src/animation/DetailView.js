import * as THREE from "three";

/**
 * DetailView - Two-step "enter the frame" experience.
 *
 * Stage 0: carousel     — browse the film strip
 * Stage 1: preview      — camera zooms into the active frame, bottom summary
 * Stage 2: course page  — full detail page, background matches the film colors
 *
 * Scroll down / swipe up / pinch-out  -> go one stage deeper
 * Scroll up / swipe down / pinch-in   -> go one stage back
 * Long-press (mobile)                 -> jump straight into the detail page
 * On the course page, scrolling past the bottom seamlessly loads the NEXT
 * course (with a "keep scrolling" buffer hint so it never feels abrupt).
 */
export default class DetailView {

  constructor(cameraWrapper, reel, carousel, frameData) {
    this.cameraWrapper = cameraWrapper;
    this.camera = cameraWrapper.camera;
    this.reel = reel;
    this.carousel = carousel;
    this.frameData = frameData;

    this.stage = 0;    // 0 = carousel, 1 = preview, 2 = course page
    this.t = 0;        // 0 = carousel, 1 = zoomed close-up
    this.wheelAcc = 0; // accumulated wheel delta with decay

    this.courseEl = document.querySelector("#course-page");
    this.courseScroll = document.querySelector("#course-scroll");

    // Seamless "scroll past the bottom → next course" state + buffer hint
    this.nextAcc = 0;
    this.nextThreshold = 150;
    this.nextHint = document.querySelector("#next-hint");
    this.nextHintBar = document.querySelector("#next-hint-bar");

    // Tap detection / raycasting
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.downX = 0;
    this.downY = 0;
    this.downTime = 0;

    this.bindEvents();
  }

  /** Gestures ignored while a UI layer (menu / about / simple mode / intro) is open. */
  _uiBlocked() {
    return document.body.classList.contains("menu-open") ||
           document.body.classList.contains("about-open") ||
           document.body.classList.contains("intro-active") ||
           document.body.classList.contains("simple-mode");
  }

  bindEvents() {
    // ---- Wheel: down goes deeper / next course, up goes back ----
    window.addEventListener("wheel", (e) => {
      if (this._uiBlocked()) return;

      if (this.stage === 2) {
        const sc = this.courseScroll;
        const atTop = !sc || sc.scrollTop <= 0;
        const atBottom = sc && (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2);
        if (e.deltaY < 0 && atTop) {
          e.preventDefault();
          this.wheelAcc += e.deltaY;
          if (this.wheelAcc < -120) { this.setStage(1); this.wheelAcc = 0; }
        } else if (e.deltaY > 0 && atBottom) {
          e.preventDefault();
          this.nextAcc += e.deltaY;
          this._updateNextHint();
          if (this.nextAcc >= this.nextThreshold) this._goNextCourse();
        }
        return;
      }

      e.preventDefault();
      this.wheelAcc += e.deltaY;
      if (this.wheelAcc > 80) { this.setStage(this.stage + 1); this.wheelAcc = 0; }
      else if (this.wheelAcc < -80 && this.stage > 0) { this.setStage(this.stage - 1); this.wheelAcc = 0; }
    }, { passive: false });

    // ---- Touch gestures: swipe / pinch / long-press ----
    this._touchStartY = 0;
    this._touchStartX = 0;
    this._touchStartTime = 0;
    this._pinchStartDist = 0;
    this._pinchLastDist = 0;
    this._pinching = false;
    this._longPressTimer = null;
    this._longPressFired = false;

    const clearLongPress = () => {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }
    };

    window.addEventListener("touchstart", (e) => {
      if (this._uiBlocked()) return;

      if (e.touches.length === 2) {
        clearLongPress();
        this._pinching = true;
        this._pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this._pinchLastDist = this._pinchStartDist;
        return;
      }

      this._touchStartY = e.touches[0].clientY;
      this._touchStartX = e.touches[0].clientX;
      this._touchStartTime = performance.now();
      this._longPressFired = false;

      // Long-press (550ms without moving) → straight into the detail page
      if (this.stage < 2 && !e.target.closest("button") && !e.target.closest("a") && !e.target.closest("#indicators")) {
        const sx = e.touches[0].clientX;
        const sy = e.touches[0].clientY;
        clearLongPress();
        this._longPressTimer = setTimeout(() => {
          this._longPressFired = true;
          if (navigator.vibrate) navigator.vibrate(18);
          if (this.stage === 0) {
            const idx = this._raycastIndex(sx, sy);
            if (idx != null && idx !== this.reel.getActiveIndex()) {
              this.carousel.goToFrame(idx);
              this.setStage(2);
              this.fillCoursePage(this.frameData[idx], idx);
              return;
            }
          }
          this.setStage(2);
        }, 550);
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (this._pinching && e.touches.length === 2) {
        this._pinchLastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        return;
      }

      if (this._longPressTimer && e.touches.length === 1) {
        const mdx = e.touches[0].clientX - this._touchStartX;
        const mdy = e.touches[0].clientY - this._touchStartY;
        if (Math.hypot(mdx, mdy) > 12) clearLongPress();
      }

      // Overscroll-at-bottom on the course page drives the buffer hint
      if (this.stage === 2 && e.touches.length === 1 && !this._uiBlocked()) {
        const sc = this.courseScroll;
        const atBottom = sc && (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2);
        if (atBottom) {
          const pull = this._touchStartY - e.touches[0].clientY;
          if (pull > 0) {
            this.nextAcc = Math.max(this.nextAcc, pull * 1.4);
            this._updateNextHint();
          }
        }
      }
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      clearLongPress();
      if (this._uiBlocked()) { this._pinching = false; return; }

      // Pinch release: zoom-in goes deeper, zoom-out goes back
      if (this._pinching) {
        if (e.touches.length === 0) {
          this._pinching = false;
          const endDist = this._pinchLastDist || this._pinchStartDist;
          const ratio = endDist / (this._pinchStartDist || 1);
          if (ratio > 1.25 && this.stage < 2) this.setStage(this.stage + 1);
          else if (ratio < 0.8 && this.stage > 0) this.setStage(this.stage - 1);
        }
        return;
      }

      if (this._longPressFired) return;

      const dy = e.changedTouches[0].clientY - this._touchStartY;
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dt = performance.now() - this._touchStartTime;

      if (this.stage === 2) {
        const sc = this.courseScroll;
        const atTop = !sc || sc.scrollTop <= 0;
        const atBottom = sc && (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2);
        if (dy > 40 && atTop) {
          this.setStage(1);
        } else if (dy < -30 && atBottom && (this.nextAcc >= this.nextThreshold * 0.6 || dy < -70)) {
          this._goNextCourse();
        }
        this.nextAcc = 0;
        this._hideNextHint();
        return;
      }

      if (Math.abs(dy) < 50 || Math.abs(dy) < Math.abs(dx) * 1.2 || dt > 500) return;
      if (dy < 0) this.setStage(this.stage + 1);       // swipe up -> deeper
      else if (this.stage > 0) this.setStage(this.stage - 1); // swipe down -> back
    }, { passive: true });

    window.addEventListener("touchcancel", () => {
      clearLongPress();
      this._pinching = false;
    }, { passive: true });

    // Tap (press + release without moving) -> raycast into the strip
    window.addEventListener("pointerdown", (e) => {
      this.downX = e.clientX;
      this.downY = e.clientY;
      this.downTime = performance.now();
    });

    window.addEventListener("pointerup", (e) => {
      if (this._uiBlocked() || this.stage !== 0) return;
      const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
      if (moved > 6 || performance.now() - this.downTime > 400) return;
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest("#indicators")) return;
      this.handleTap(e.clientX, e.clientY);
    });

    // Back buttons + Escape step back one stage
    const back = document.querySelector("#detail-back");
    if (back) back.addEventListener("click", () => this.setStage(0));
    const courseBack = document.querySelector("#course-back");
    // Simple mode has no preview stage — the back button returns to the catalog
    if (courseBack) courseBack.addEventListener("click", () =>
      this.setStage(document.body.classList.contains("simple-mode") ? 0 : 1));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.stage > 0) this.setStage(this.stage - 1);
    });

    // "查看完整课程" button on the preview goes deeper
    const enterBtn = document.querySelector("#detail-link");
    if (enterBtn) enterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.setStage(2);
    });
  }

  /** Rebind to another reel + its course data (instructor switch). */
  setReel(reel, frameData) {
    this.reel = reel;
    this.frameData = frameData;
    if (this.stage !== 0) this.setStage(0);
  }

  /** Raycast a screen point into the strip, returning a frame index or null. */
  _raycastIndex(x, y) {
    this.pointer.x = (x / window.innerWidth) * 2 - 1;
    this.pointer.y = -(y / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.reel.strip, false);
    if (!hits.length || !hits[0].uv) return null;
    return this.reel.frameIndexFromUV(hits[0].uv);
  }

  handleTap(x, y) {
    const index = this._raycastIndex(x, y);
    if (index == null) return;
    if (index === this.reel.getActiveIndex()) {
      if (this.stage === 0) this.setStage(1);
    } else {
      this.carousel.goToFrame(index);
    }
  }

  setStage(next) {
    next = Math.max(0, Math.min(2, next));
    if (next === this.stage) return;

    const data = this.frameData[this.reel.getActiveIndex()];

    if (next >= 1 && this.stage === 0) this.fillPreview(data);
    if (next === 2) this.fillCoursePage(data);

    this.stage = next;
    // In simple mode the 3D drag stays disabled even back at the "carousel" stage
    this.carousel.enabled = this.stage === 0 &&
      !document.body.classList.contains("simple-mode");

    document.body.classList.toggle("detail-mode", this.stage >= 1);
    document.body.classList.toggle("course-mode", this.stage === 2);

    if (this.stage === 2) {
      this.nextAcc = 0;
      this._hideNextHint();
      if (this.courseScroll) this.courseScroll.scrollTop = 0;
    }
  }

  /** Stage 1 — bottom overlay summary (the "preview page"). */
  fillPreview(data) {
    document.querySelector("#detail-title").textContent = data.title;
    document.querySelector("#detail-subtitle").textContent = data.subtitle;
    document.querySelector("#detail-desc").textContent = data.desc || "";
    document.querySelector("#detail-tags").textContent = data.tags || "";
  }

  /** Stage 2 — full course page, background matches the film colors. */
  fillCoursePage(data, idx) {
    if (!this.courseEl) return;
    const index = (idx != null) ? idx : this.reel.getActiveIndex();

    this.courseEl.style.background =
      `linear-gradient(150deg, ${data.colorA} 0%, ${data.colorA} 35%, ${data.colorB} 130%)`;

    document.querySelector("#course-no").textContent =
      `COURSE ${String(index + 1).padStart(2, "0")} / ${String(this.frameData.length).padStart(2, "0")}`;
    document.querySelector("#course-title").textContent = data.title;
    document.querySelector("#course-keyword").textContent = `${data.subtitle} · ${data.tags}`;
    document.querySelector("#course-question").textContent = data.core || "";

    const theoryEl = document.querySelector("#course-theory");
    theoryEl.innerHTML = "";
    (data.theory || []).forEach((p) => {
      const el = document.createElement("p");
      el.textContent = p;
      theoryEl.appendChild(el);
    });

    const imgSec = document.querySelector("#course-imagery-section");
    if (data.imagery) {
      imgSec.style.display = "";
      document.querySelector("#course-imagery").textContent = data.imagery;
    } else {
      imgSec.style.display = "none";
    }

    this.courseEl.style.setProperty("--course-accent", data.colorB);
  }

  // ---- Seamless next-course buffer hint ----
  _updateNextHint() {
    if (!this.nextHint) return;
    const p = Math.min(1, this.nextAcc / this.nextThreshold);
    this.nextHint.classList.add("visible");
    if (this.nextHintBar) this.nextHintBar.style.transform = `scaleX(${p})`;
  }

  _hideNextHint() {
    if (!this.nextHint) return;
    this.nextHint.classList.remove("visible");
    if (this.nextHintBar) this.nextHintBar.style.transform = "scaleX(0)";
  }

  _goNextCourse() {
    this.nextAcc = 0;
    this._hideNextHint();
    const next = (this.reel.getActiveIndex() + 1) % this.frameData.length;
    this.carousel.goToFrame(next);
    this.fillCoursePage(this.frameData[next], next);
    if (this.courseScroll) this.courseScroll.scrollTop = 0;
    if (this.courseEl) {
      this.courseEl.classList.remove("course-switch");
      void this.courseEl.offsetWidth; // restart the transition
      this.courseEl.classList.add("course-switch");
    }
  }

  update() {
    // Smooth zoom transition (zoomed for both preview & course page)
    const target = this.stage >= 1 ? 1 : 0;
    this.t += (target - this.t) * 0.07;
    if (Math.abs(target - this.t) < 0.001) this.t = target;

    this.cameraWrapper.setZoom(this.t);

    // Straighten the winding strip while entering the frame
    this.reel.rotation.z = this.reel.tilt * (1 - this.t);

    // Let unfinished wheel gestures fade away
    this.wheelAcc *= 0.92;

    // Decay the seamless-next accumulator when the user stops pushing
    if (this.stage === 2 && this.nextAcc > 0) {
      this.nextAcc *= 0.90;
      if (this.nextAcc < 4) { this.nextAcc = 0; this._hideNextHint(); }
      else this._updateNextHint();
    }
  }
}
