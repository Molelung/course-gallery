import * as THREE from "three";


import {
EffectComposer
}
from
"three/examples/jsm/postprocessing/EffectComposer.js";


import {
RenderPass
}
from
"three/examples/jsm/postprocessing/RenderPass.js";


import {
UnrealBloomPass
}
from
"three/examples/jsm/postprocessing/UnrealBloomPass.js";





export default class PostProcessing{


constructor(
renderer,
scene,
camera
){



this.composer =

new EffectComposer(
renderer.renderer
);





const renderPass =

new RenderPass(

scene,

camera.camera

);



this.composer.addPass(
renderPass
);





const bloom =

new UnrealBloomPass(

new THREE.Vector2(

window.innerWidth,

window.innerHeight

),


0.35,


0.4,


0.15

);



this.composer.addPass(
bloom
);



}





render(){

this.composer.render();


}





resize(){


this.composer.setSize(

window.innerWidth,

window.innerHeight

);



}



}
