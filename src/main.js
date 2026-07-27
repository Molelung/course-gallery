import * as THREE from "three";


import { CONFIG } from "./config.js";


import SceneManager from "./scene/SceneManager.js";

import Renderer from "./scene/Renderer.js";

import Camera from "./scene/Camera.js";

import Lights from "./scene/Lights.js";

import FilmReel
from "./objects/FilmReel.js";

import PostProcessing
from "./scene/PostProcessing.js";

import IntroAnimation
from "./animation/IntroAnimation.js";

import Interaction
from "./animation/Interaction.js";

import ScrollAnimation
from "./animation/ScrollAnimation.js";





//////////////////////////////////////////////////
// 初始化
//////////////////////////////////////////////////


const canvas =
document.querySelector("#webgl");



const renderer =
new Renderer(canvas);



const sceneManager =
new SceneManager();



const film =
new FilmReel();


sceneManager.add(
film
);



const camera =
new Camera();



const lights =
new Lights(
sceneManager.scene
);



const postProcessing =
new PostProcessing(

renderer,

sceneManager.scene,

camera

);



const intro =
new IntroAnimation(
film
);



const interaction =
new Interaction(
camera.camera
);



const scroll =
new ScrollAnimation(

film,

camera.camera

);




//////////////////////////////////////////////////
// 时钟
//////////////////////////////////////////////////

const clock =
new THREE.Clock();




//////////////////////////////////////////////////
// 动画循环
//////////////////////////////////////////////////

function animate(){


requestAnimationFrame(
animate
);



const delta =
clock.getDelta();



const elapsed =
clock.getElapsedTime();




sceneManager.update(
elapsed,
delta
);



intro.update();


interaction.update();


scroll.update();



postProcessing.render();



}



animate();





//////////////////////////////////////////////////
// Resize
//////////////////////////////////////////////////


window.addEventListener(
"resize",

()=>{


camera.resize();


renderer.resize();



});
