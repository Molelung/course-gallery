import * as THREE from "three";
import SceneManager from "./scene/SceneManager.js";
import Renderer from "./scene/Renderer.js";
import Camera from "./scene/Camera.js";
import Lights from "./scene/Lights.js";
import FilmReel from "./objects/FilmReel.js";
import PostProcessing from "./scene/PostProcessing.js";
import IntroAnimation from "./animation/IntroAnimation.js";
import SplashAnimation from "./animation/SplashAnimation.js";
import Interaction from "./animation/Interaction.js";
import CarouselController from "./animation/ScrollAnimation.js";
import DetailView from "./animation/DetailView.js";
import { getDefaultFrames } from "./utils/CanvasTexture.js";

//////////////////////////////////////////////////
// Side Menu Toggle
////////////////////////////////////////////////////

const menuToggle = document.querySelector(".menu-toggle");
const menuClose = document.querySelector(".menu-close");
const menuOverlay = document.querySelector("#menu-overlay");
const menuLinks = document.querySelectorAll(".menu-list a");

function openMenu() {
  document.body.classList.add("menu-open");
}

function closeMenu() {
  document.body.classList.remove("menu-open");
}

if (menuToggle) menuToggle.addEventListener("click", openMenu);
if (menuClose) menuClose.addEventListener("click", closeMenu);
if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

menuLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    closeMenu();
  });
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
    closeMenu();
  }
});

//////////////////////////////////////////////////
// Section Heading: show briefly then fade out when intro begins
////////////////////////////////////////////////////

const sectionHeading = document.querySelector("#section-heading");
let headingShown = false;

function showHeading() {
  if (headingShown || !sectionHeading) return;
  headingShown = true;
  sectionHeading.classList.add("visible");
  setTimeout(() => {
    sectionHeading.classList.remove("visible");
  }, 4000);
}

//////////////////////////////////////////////////
// Init
//////////////////////////////////////////////////

const canvas = document.querySelector("#webgl");
const renderer = new Renderer(canvas);
const sceneManager = new SceneManager();

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

const intro = new IntroAnimation(film);
const interaction = new Interaction(camera.camera);

// Splash screen: film reel opens, then triggers the 3D intro + heading
const splash = new SplashAnimation({
  onComplete: () => {
    intro.begin();
    showHeading();
  }
});
intro.waitFor(splash);

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

  postProcessing.render();
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
