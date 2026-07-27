import * as THREE from "three";


import { CONFIG }
from "../config.js";



export default class Renderer{


constructor(canvas){



this.renderer =
new THREE.WebGLRenderer({

canvas,

antialias:true,

alpha:true


});




this.renderer.setSize(

window.innerWidth,

window.innerHeight

);





this.renderer.setPixelRatio(

CONFIG.PERFORMANCE.PIXEL_RATIO

);





// 色彩管理


this.renderer.outputColorSpace =

THREE.SRGBColorSpace;




// HDR电影色调


this.renderer.toneMapping =

THREE.ACESFilmicToneMapping;



this.renderer.toneMappingExposure=

1.2;




}



render(scene,camera){


this.renderer.render(

scene,

camera

);



}



resize(){


this.renderer.setSize(

window.innerWidth,

window.innerHeight

);



this.renderer.setPixelRatio(

CONFIG.PERFORMANCE.PIXEL_RATIO

);


}



}
