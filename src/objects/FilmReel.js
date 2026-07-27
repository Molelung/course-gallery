import * as THREE from "three";


import createFilmMaterial

from "./FilmMaterial.js";



import createDust

from "./DustParticles.js";




export default class FilmReel extends THREE.Group{


constructor(){


super();



this.rotationSpeed = 0.25;



this.createReel();



}





createReel(){



//////////////////////////////////////////////////
// 材质
//////////////////////////////////////////////////


const blackMetal =

new THREE.MeshPhysicalMaterial({


color:0x111111,


metalness:0.9,


roughness:0.25,


clearcoat:1


});



const silver =

new THREE.MeshPhysicalMaterial({


color:0x555555,


metalness:1,


roughness:0.15


});






//////////////////////////////////////////////////
// 左右卷盘
//////////////////////////////////////////////////


for(
let z of [-0.35,0.35]
){



const disk =

new THREE.Mesh(

new THREE.CylinderGeometry(

2,

2,

0.12,

128

),

blackMetal

);



disk.rotation.x=

Math.PI/2;



disk.position.z=z;



this.add(disk);




const ring =

new THREE.Mesh(

new THREE.TorusGeometry(

1.8,

0.08,

32,

128

),

silver

);



ring.rotation.x=

Math.PI/2;



ring.position.z=z;



this.add(ring);



}






//////////////////////////////////////////////////
// 中心轴
//////////////////////////////////////////////////


const hub =

new THREE.Mesh(

new THREE.CylinderGeometry(

0.35,

0.35,

0.8,

64

),

silver

);



hub.rotation.x=

Math.PI/2;



this.add(hub);







//////////////////////////////////////////////////
// 胶片
//////////////////////////////////////////////////


const curvePoints=[];



for(
let i=0;
i<300;
i++
){



const t=i/299;



const angle=

t*Math.PI*16;



const radius=

1.45-

t*1.05;



curvePoints.push(

new THREE.Vector3(

Math.cos(angle)*radius,

Math.sin(angle)*radius,

0

)

);



}





const curve=

new THREE.CatmullRomCurve3(

curvePoints

);





const filmGeometry=

new THREE.TubeGeometry(

curve,

500,

0.025,

8

);





const film=

new THREE.Mesh(

filmGeometry,

createFilmMaterial()

);



this.add(film);






//////////////////////////////////////////////////
// 灰尘
//////////////////////////////////////////////////

this.add(
createDust()
);



}






update(elapsed){



this.rotation.y +=

0.002;



this.position.y =

Math.sin(elapsed)

*

0.05;



}



}
