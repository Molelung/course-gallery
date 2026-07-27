import * as THREE from "three";



export default class SceneManager{


constructor(){


this.scene =
new THREE.Scene();



this.scene.background =
new THREE.Color(
0x020202
);



this.objects=[];



}




add(object){


this.scene.add(
object
);


this.objects.push(
object
);


}





update(
elapsed,
delta
){



this.objects.forEach(
obj=>{


if(
obj.update
){

obj.update(
elapsed,
delta
);


}


}

);



}


}
