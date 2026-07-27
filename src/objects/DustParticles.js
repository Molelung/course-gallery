import * as THREE from "three";



export default function createDust(){



const count = 800;



const positions = [];



for(
let i=0;
i<count;
i++
){


positions.push(

(Math.random()-0.5)*10,


Math.random()*5-1,


(Math.random()-0.5)*10

);


}





const geometry =

new THREE.BufferGeometry();



geometry.setAttribute(

"position",

new THREE.Float32BufferAttribute(

positions,

3

)

);





const material =

new THREE.PointsMaterial({


color:0xffffff,


size:0.015,


transparent:true,


opacity:0.35



});





const particles =

new THREE.Points(

geometry,

material

);





return particles;


}
