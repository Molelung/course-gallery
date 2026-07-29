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
import { getDefaultFrames } from "./utils/CanvasTexture.js";

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

const film = new FilmReel();
sceneManager.add(film);

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

// Hide the UI chrome until the opening sequence is underway
document.body.classList.add("intro-pending");
const revealChrome = () => document.body.classList.remove("intro-pending");

// The opening is USER-TRIGGERED: once the loader fades, the roll sits
// centred (armed) with a hint. First click begins the sequence; a click
// during the sequence skips to the end. Carousel/drag stays off until done.
const flatStart = new URLSearchParams(location.search).has("flat");
if (flatStart) {
  intro.skipToEnd();
} else {
  document.body.classList.add("intro-active");
  setTimeout(() => {
    if (!intro.finished) document.body.classList.add("intro-armed");
  }, 800);

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    if (document.body.classList.contains("intro-armed")) {
      document.body.classList.remove("intro-armed");
      intro.begin();
      setTimeout(revealChrome, 2000);
    } else if (!intro.finished) {
      document.body.classList.remove("intro-armed");
      intro.skipToEnd();
    }
  });
}

// Debug handles for headless verification
window.__film = film;
window.__intro = intro;

// Frame data for UI updates
const frameData = getDefaultFrames();

// Build dot indicators
const indicatorsEl = document.querySelector("#indicators");
for (let i = 0; i < frameData.length; i++) {
  const dot = document.createElement("div");
  dot.className = "dot" + (i === 0 ? " active" : "");
  dot.addEventListener("click", () => carousel.goToFrame(i));
  indicatorsEl.appendChild(dot);
}

// Carousel controller with frame change callback
const carousel = new CarouselController(film, {
  onFrameChange: (index) => {
    // Update text
    document.querySelector("#frame-title").textContent = frameData[index].title;
    document.querySelector("#frame-subtitle").textContent = frameData[index].subtitle;

    // Update dots
    const dots = indicatorsEl.querySelectorAll(".dot");
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  }
});

// Detail view: scroll / click to enter the active frame
const detail = new DetailView(camera, film, carousel, frameData);

// Drag & gestures stay off until the opening sequence finishes
if (!intro.finished) carousel.enabled = false;

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

// Build the course catalog dynamically from frame data
if (courseListEl) {
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
}

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

// Build the plain catalog cards from the same frame data
if (simpleGrid) {
  frameData.forEach((f, i) => {
    const card = document.createElement("button");
    card.className = "simple-card";
    card.innerHTML =
      `<span class="sc-idx">COURSE ${String(i + 1).padStart(2, "0")} · ${f.tags || ""}</span>` +
      `<span class="sc-title">${f.title}</span>` +
      `<span class="sc-sub">${f.subtitle}</span>`;
    card.addEventListener("click", () => {
      // Straight to the reading page — no 3D interaction in simple mode
      carousel.goToFrame(i);
      detail.setStage(2);
    });
    simpleGrid.appendChild(card);
  });
}

function setSimpleMode(on) {
  document.body.classList.toggle("simple-mode", on);
  if (modeToggle) modeToggle.classList.toggle("on", on);
  if (on) {
    // Leave any open stage, freeze the 3D drag, show the plain catalog
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

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  sceneManager.update(elapsed, delta);
  intro.update();
  interaction.update();
  carousel.update();
  detail.update();

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
