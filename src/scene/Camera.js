import * as THREE from "three";


import { CONFIG }
from "../config.js";



export default class Camera{


constructor(){



this.camera =

new THREE.PerspectiveCamera(


CONFIG.CAMERA.FOV,


window.innerWidth /

window.innerHeight,


CONFIG.CAMERA.NEAR,


CONFIG.CAMERA.FAR



);





this.camera.position.set(


CONFIG.CAMERA.POSITION.x,


CONFIG.CAMERA.POSITION.y,


CONFIG.CAMERA.POSITION.z


);




}




resize(){



this.camera.aspect =

window.innerWidth /

window.innerHeight;



this.camera.updateProjectionMatrix();



}



}
