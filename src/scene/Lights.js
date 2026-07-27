import * as THREE from "three";



export default class Lights{


constructor(scene){



// 主光


const keyLight =

new THREE.DirectionalLight(

0xffffff,

3

);



keyLight.position.set(

4,

5,

3

);



scene.add(
keyLight
);





// 暖色轮廓光


const warmLight =

new THREE.PointLight(

0xff8844,

15,

10

);



warmLight.position.set(

-3,

2,

2

);



scene.add(
warmLight
);





// 蓝色补光


const blueLight =

new THREE.PointLight(

0x4488ff,

10,

10

);



blueLight.position.set(

3,

0,

-3

);



scene.add(
blueLight
);






// 环境光


const ambient =

new THREE.AmbientLight(

0xffffff,

0.2

);



scene.add(
ambient
);



}



}
