import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import SceneManager from "./scene/SceneManager.js";
import Renderer from "./scene/Renderer.js";
import Camera from "./scene/Camera.js";
import Lights from "./scene/Lights.js";
import FilmReel from "./objects/FilmReel.js";
import PostProcessing from "./scene/PostProcessing.js";
import IntroAnimation from "./animation/IntroAnimation.js";
import Interaction from "./animation/Interaction.js";
import CarouselController from "./animation/ScrollAnimation.js";
import DetailView from "./animation/DetailView.js";
import { COURSE_SETS } from "./utils/CanvasTexture.js";

//////////////////////////////////////////////////
// Init
//////////////////////////////////////////////////

const canvas = document.querySelector("#webgl");
const renderer = new Renderer(canvas);
const sceneManager = new SceneManager();

// Image-based lighting so the film's clearcoat / metal has something to reflect
const pmrem = new THREE.PMREMGenerator(renderer.renderer);
sceneManager.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

// One reel of film per instructor. The active one sits dead centre; the
// other waits parked at the edge of the screen — swipe to switch.
const reels = COURSE_SETS.map((set) => new FilmReel(set));
reels.forEach((r) => sceneManager.add(r));
let activeIdx = 0;
let film = reels[activeIdx];
let frameData = COURSE_SETS[activeIdx].frames;

const camera = new Camera();
camera.attach(film);
const lights = new Lights(sceneManager.scene);

const postProcessing = new PostProcessing(
  renderer,
  sceneManager.scene,
  camera
);

const intro = new IntroAnimation(film, camera);
const interaction = new Interaction(camera.camera);

// The other instructor's roll waits at its parked spot. On wide screens it
// peeks in from the right edge; on narrow (portrait phone) screens a peek
// would overlap the centred roll, so it hides fully off-screen instead and
// the reel-dots / swipe hint carry the discovery.
let parkedPeek = intro.peekAllowed ? { ...intro.posePeekR } : { ...intro.poseOffR };
reels[1].position.set(parkedPeek.x, parkedPeek.y, parkedPeek.z);
reels[1].visible = intro.peekAllowed;

// Hide the UI chrome until the opening sequence is underway
document.body.classList.add("intro-pending");
const revealChrome = () => document.body.classList.remove("intro-pending");

// The opening is USER-TRIGGERED: once the loader fades, the roll sits
// centred (armed) with a hint. A TAP opens it; a horizontal SWIPE switches
// to the other instructor's roll; a click during the sequence skips ahead.
const flatStart = new URLSearchParams(location.search).has("flat");
if (flatStart) {
  intro.skipToEnd();
  reels[1].visible = false;
} else {
  document.body.classList.add("intro-active");
  setTimeout(() => {
    if (!intro.finished) document.body.classList.add("intro-armed");
  }, 800);

  // Armed gestures — tap-vs-swipe is judged across the whole press, so a
  // swipe never fires the opening and a tap never switches reels.
  let armTrack = null; // { x, y, swiped }

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    if (document.body.classList.contains("intro-armed")) {
      armTrack = { x: e.clientX, y: e.clientY, swiped: false };
    } else if (!intro.finished) {
      document.body.classList.remove("intro-armed");
      intro.skipToEnd();
    }
  });

  window.addEventListener("pointermove", (e) => {
    if (!armTrack || armTrack.swiped) return;
    const dx = e.clientX - armTrack.x;
    const dy = e.clientY - armTrack.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      armTrack.swiped = true;
      switchReel(dx < 0 ? 1 : -1);
    }
  });

  window.addEventListener("pointerup", (e) => {
    if (!armTrack) return;
    const moved = Math.hypot(e.clientX - armTrack.x, e.clientY - armTrack.y);
    if (!armTrack.swiped && moved < 10 && intro.mode === "armed") {
      document.body.classList.remove("intro-armed");
      intro.begin();
      setTimeout(revealChrome, 2000);
    }
    armTrack = null;
  });

  window.addEventListener("pointercancel", () => { armTrack = null; });
}

// Debug handles for headless verification
window.__film = film;
window.__intro = intro;

//////////////////////////////////////////////////
// Reel dots — tappable instructor switcher in the opening hint
//////////////////////////////////////////////////

const reelDotsEl = document.querySelector("#reel-dots");
if (reelDotsEl) {
  COURSE_SETS.forEach((set, i) => {
    const b = document.createElement("button");
    b.className = "reel-dot" + (i === activeIdx ? " active" : "");
    b.textContent = set.instructor;
    b.addEventListener("click", () => {
      if (i !== activeIdx) switchReel(i > activeIdx ? 1 : -1);
    });
    reelDotsEl.appendChild(b);
  });
}

function syncReelDots() {
  if (!reelDotsEl) return;
  reelDotsEl.querySelectorAll(".reel-dot").forEach((d, i) =>
    d.classList.toggle("active", i === activeIdx));
}

//////////////////////////////////////////////////
// Per-reel UI (dots / texts are rebuilt on every instructor switch)
//////////////////////////////////////////////////

const indicatorsEl = document.querySelector("#indicators");

function updateFrameInfo(index) {
  document.querySelector("#frame-title").textContent = frameData[index].title;
  document.querySelector("#frame-subtitle").textContent = frameData[index].subtitle;
  const dots = indicatorsEl.querySelectorAll(".dot");
  dots.forEach((d, i) => d.classList.toggle("active", i === index));
}

// Carousel controller with frame change callback
const carousel = new CarouselController(film, {
  onFrameChange: (index) => updateFrameInfo(index)
});

// Detail view: scroll / click to enter the active frame
const detail = new DetailView(camera, film, carousel, frameData);

// Drag & gestures stay off until the opening sequence finishes
if (!intro.finished) carousel.enabled = false;

function rebuildDots() {
  indicatorsEl.innerHTML = "";
  frameData.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dot.addEventListener("click", () => carousel.goToFrame(i));
    indicatorsEl.appendChild(dot);
  });
}
rebuildDots();

//////////////////////////////////////////////////
// Reel switching — swipe (armed) & simple-mode jump (instant)
//////////////////////////////////////////////////

// Slide tween state for the armed-state swipe switch
const reelSwitch = {
  active: false, t0: 0, dur: 620, newIdx: 0,
  curFrom: null, curTo: null, newFrom: null
};

/** Point every subsystem at another reel and rebuild its UI. */
function bindActiveReel(idx) {
  activeIdx = idx;
  film = reels[idx];
  frameData = COURSE_SETS[idx].frames;
  carousel.setReel(film);
  detail.setReel(film, frameData);
  intro.attach(film);
  rebuildDots();
  rebuildMenu();
  updateFrameInfo(film.getActiveIndex());
  syncReelDots();
  window.__film = film;
}

/** Armed-state swipe: slide the current roll out, the other one in. */
function switchReel(dir) {
  if (intro.mode !== "armed" || reelSwitch.active) return;
  const newIdx = (activeIdx + dir + reels.length) % reels.length;
  if (newIdx === activeIdx) return;
  const nr = reels[newIdx];
  // The incoming roll must be a closed roll — it may have been left
  // unrolled (but hidden) by a simple-mode jump earlier.
  nr.setUnroll(0);
  nr.rotation.y = 0;
  reelSwitch.active = true;
  reelSwitch.t0 = performance.now();
  reelSwitch.newIdx = newIdx;
  reelSwitch.curFrom = film.position.clone();
  // Wide screens: the outgoing roll docks at the opposite edge's peek spot;
  // narrow screens: it exits the frustum entirely (no peeking there).
  if (intro.peekAllowed) {
    reelSwitch.curTo = dir > 0 ? { ...intro.posePeekL } : { ...intro.posePeekR };
  } else {
    reelSwitch.curTo = dir > 0 ? { ...intro.poseOffL } : { ...intro.poseOffR };
  }
  reelSwitch.newFrom = nr.position.clone();
  nr.visible = true;
  nr.position.set(reelSwitch.newFrom.x, reelSwitch.newFrom.y, reelSwitch.newFrom.z);
  intro.suspended = true; // freeze the idle bob while the tween owns positions
}

//////////////////////////////////////////////////
// Long-press on the laid film → wind it back onto the roll
//////////////////////////////////////////////////
// 650 ms hold with <12 px drift, only at the carousel level with no
// overlay open. The roll then re-arms at dead centre and the "轻触展开胶卷"
// hint returns, so the whole opening can be played again with a tap.
const LP_HOLD = 650;
const LP_DRIFT = 12;
let lpTimer = null, lpX = 0, lpY = 0;

const lpCancel = () => {
  if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
};

window.addEventListener("pointerdown", (e) => {
  if (intro.mode !== "done") return;
  if (detail.stage !== 0) return;
  if (e.target.closest("button") || e.target.closest("a")) return;
  const b = document.body.classList;
  if (b.contains("simple-mode") || b.contains("menu-open") || b.contains("about-open")) return;
  lpX = e.clientX;
  lpY = e.clientY;
  lpTimer = setTimeout(() => {
    lpTimer = null;
    // Re-verify at fire time: the state may have changed during the hold
    // (e.g. a course page opened underneath the finger).
    if (intro.mode !== "done" || detail.stage !== 0) return;
    // Wind back: close any open stage, freeze input & chrome; onRewound
    // re-arms the opening. The parked roll must also be a closed roll.
    detail.setStage(0);
    carousel.enabled = false;
    reels.forEach((r) => {
      if (r !== film) { r.setUnroll(0); r.rotation.y = 0; }
    });
    document.body.classList.add("intro-pending", "intro-active");
    intro.rewind();
  }, LP_HOLD);
});
window.addEventListener("pointermove", (e) => {
  if (!lpTimer) return;
  if (Math.hypot(e.clientX - lpX, e.clientY - lpY) > LP_DRIFT) lpCancel();
});
window.addEventListener("pointerup", lpCancel);
window.addEventListener("pointercancel", lpCancel);

intro.onRewound = () => document.body.classList.add("intro-armed");

//////////////////////////////////////////////////
// Side Menu: hamburger -> course catalog + About Us
//////////////////////////////////////////////////

const menuToggle = document.querySelector(".menu-toggle");
const menuClose = document.querySelector(".menu-close");
const menuOverlay = document.querySelector("#menu-overlay");
const courseListEl = document.querySelector("#menu-course-list");

function openMenu() {
  document.body.classList.add("menu-open");
  syncMenuActive();
}

function closeMenu() {
  document.body.classList.remove("menu-open");
}

function syncMenuActive() {
  const active = film.getActiveIndex();
  courseListEl.querySelectorAll("a").forEach((a, i) => {
    a.classList.toggle("active", i === active);
  });
}

// (Re)build the course catalog from the active reel's frame data
function rebuildMenu() {
  if (!courseListEl) return;
  courseListEl.innerHTML = "";
  frameData.forEach((f, i) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.innerHTML =
      `<span class="menu-idx">${String(i + 1).padStart(2, "0")}</span>` +
      `<span class="menu-name">${f.title}</span>`;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      // Jump back to carousel level, then slide to the chosen course in real time
      detail.setStage(0);
      carousel.goToFrame(i);
      syncMenuActive();
      closeMenu();
    });
    li.appendChild(a);
    courseListEl.appendChild(li);
  });
  const label = document.querySelector(".menu-section-label");
  if (label) {
    const set = COURSE_SETS[activeIdx];
    label.textContent = `${set.instructor} · 课程目录 · ${set.frames.length} 节`;
  }
}
rebuildMenu();

if (menuToggle) menuToggle.addEventListener("click", openMenu);
if (menuClose) menuClose.addEventListener("click", closeMenu);
if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
    closeMenu();
  }
});

// About Us overlay
const aboutLink = document.querySelector("#menu-about");
const aboutPage = document.querySelector("#about-page");
const aboutClose = document.querySelector("#about-close");

if (aboutLink) aboutLink.addEventListener("click", (e) => {
  e.preventDefault();
  closeMenu();
  document.body.classList.add("about-open");
});
if (aboutClose) aboutClose.addEventListener("click", () => {
  document.body.classList.remove("about-open");
});
if (aboutPage) aboutPage.addEventListener("click", (e) => {
  if (e.target === aboutPage) document.body.classList.remove("about-open");
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("about-open")) {
    document.body.classList.remove("about-open");
  }
});

//////////////////////////////////////////////////
// Simple / Complex mode toggle (light-bulb button)
//////////////////////////////////////////////////

const modeToggle = document.querySelector("#mode-toggle");
const simpleGrid = document.querySelector("#simple-grid");
const simpleTabs = document.querySelector("#simple-tabs");
let simpleTabIdx = 0;

// Build the instructor tabs (二级目录): one tab per course set
if (simpleTabs) {
  COURSE_SETS.forEach((set, i) => {
    const tab = document.createElement("button");
    tab.className = "simple-tab";
    tab.textContent = set.instructor;
    tab.addEventListener("click", () => {
      simpleTabIdx = i;
      buildSimpleGrid();
    });
    simpleTabs.appendChild(tab);
  });
}

// Build the plain catalog cards for the selected instructor
function buildSimpleGrid() {
  if (!simpleGrid) return;
  const set = COURSE_SETS[simpleTabIdx];
  const heading = document.querySelector(".simple-heading");
  const sub = document.querySelector(".simple-sub");
  if (heading) heading.textContent = `${set.series}课程`;
  if (sub) sub.textContent = `${set.frames.length} 节 · 讲师 ${set.instructor}`;
  simpleGrid.innerHTML = "";
  set.frames.forEach((f, i) => {
    const card = document.createElement("button");
    card.className = "simple-card";
    card.innerHTML =
      `<span class="sc-idx">COURSE ${String(i + 1).padStart(2, "0")} · ${f.tags || ""}</span>` +
      `<span class="sc-title">${f.title}</span>` +
      `<span class="sc-sub">${f.subtitle}</span>`;
    card.addEventListener("click", () => {
      // Picking another instructor's course instantly swaps the laid-out
      // reel underneath — no need to replay the opening.
      if (simpleTabIdx !== activeIdx) {
        reels[activeIdx].visible = false;
        bindActiveReel(simpleTabIdx);
        film.visible = true;
        intro.skipToEnd();
      }
      // Straight to the reading page — no 3D interaction in simple mode
      carousel.goToFrame(i);
      detail.setStage(2);
    });
    simpleGrid.appendChild(card);
  });
  if (simpleTabs) {
    simpleTabs.querySelectorAll(".simple-tab").forEach((t, i) =>
      t.classList.toggle("active", i === simpleTabIdx));
  }
}
buildSimpleGrid();

function setSimpleMode(on) {
  document.body.classList.toggle("simple-mode", on);
  if (modeToggle) modeToggle.classList.toggle("on", on);
  if (on) {
    // Leave any open stage, freeze the 3D drag, show the plain catalog —
    // opened on the tab of the reel currently on screen.
    simpleTabIdx = activeIdx;
    buildSimpleGrid();
    detail.setStage(0);
    carousel.enabled = false;
  } else {
    carousel.enabled = detail.stage === 0 && intro.finished;
  }
}

if (modeToggle) {
  modeToggle.addEventListener("click", () => {
    setSimpleMode(!document.body.classList.contains("simple-mode"));
  });
}

//////////////////////////////////////////////////
// Clock
//////////////////////////////////////////////////

const clock = new THREE.Clock();

//////////////////////////////////////////////////
// Animation Loop
//////////////////////////////////////////////////

let parkedT = flatStart ? 0 : 1; // 1 = parked roll peeking in, 0 = retreated

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  sceneManager.update(elapsed, delta);
  intro.update();
  interaction.update();
  carousel.update();
  detail.update();

  // Armed-state reel-switch slide tween
  if (reelSwitch.active) {
    const k = Math.min(1, (performance.now() - reelSwitch.t0) / reelSwitch.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const nr = reels[reelSwitch.newIdx];
    film.position.set(
      reelSwitch.curFrom.x + (reelSwitch.curTo.x - reelSwitch.curFrom.x) * e,
      reelSwitch.curFrom.y + (reelSwitch.curTo.y - reelSwitch.curFrom.y) * e,
      reelSwitch.curFrom.z + (reelSwitch.curTo.z - reelSwitch.curFrom.z) * e
    );
    nr.position.set(
      reelSwitch.newFrom.x + (intro.poseA.x - reelSwitch.newFrom.x) * e,
      reelSwitch.newFrom.y + (intro.poseA.y - reelSwitch.newFrom.y) * e,
      reelSwitch.newFrom.z + (intro.poseA.z - reelSwitch.newFrom.z) * e
    );
    if (k >= 1) {
      reelSwitch.active = false;
      intro.suspended = false;
      parkedPeek = reelSwitch.curTo; // the old roll stays where it slid out
      bindActiveReel(reelSwitch.newIdx);
    }
  } else {
    // Parked-roll presence: docks at its peek spot while armed; once the
    // active roll starts unrolling it SINKS back into the fog — drops a
    // touch and recedes far down the depth axis instead of crawling
    // sideways across the screen.
    const pr = reels[1 - activeIdx];
    const want = intro.mode === "armed" ? 1 : 0;
    parkedT += (want - parkedT) * 0.14;
    if (Math.abs(want - parkedT) < 0.005) parkedT = want;
    pr.visible = parkedT > 0.03;
    const sx = parkedPeek.x;
    const sy = parkedPeek.y - 0.5;
    const sz = parkedPeek.z - 9;
    pr.position.set(
      sx + (parkedPeek.x - sx) * parkedT,
      sy + (parkedPeek.y - sy) * parkedT,
      sz + (parkedPeek.z - sz) * parkedT
    );
  }

  // Opening finished (played through or skipped) → enable input & chrome
  if (intro.finished && document.body.classList.contains("intro-active")) {
    document.body.classList.remove("intro-active", "intro-armed");
    carousel.enabled = detail.stage === 0 &&
      !document.body.classList.contains("simple-mode");
    revealChrome();
  }

  // Fog ramps in as the film unrolls: the opening roll is far away and must
  // stay visible; once the strip is laid out, the tails dissolve into fog.
  const fog = sceneManager.scene.fog;
  if (fog) {
    const u = film.unroll;
    fog.near = 9.5 + (1 - u) * 8;
    fog.far = 27 + (1 - u) * 40;
  }

  // Simple mode hides the WebGL canvas entirely — skip the 3D render to
  // save battery/GPU until the user returns to the full experience.
  if (!document.body.classList.contains("simple-mode")) {
    postProcessing.render();
  }
}

animate();

// Hide loader
const loader = document.querySelector("#loader");
if (loader) {
  loader.style.opacity = "0";
  setTimeout(() => { loader.style.display = "none"; }, 1000);
}

//////////////////////////////////////////////////
// Resize
//////////////////////////////////////////////////

window.addEventListener("resize", () => {
  camera.resize();
  renderer.resize();
  postProcessing.resize();
});
