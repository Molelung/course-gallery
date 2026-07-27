export default class Interaction{


constructor(camera){


this.camera=camera;


this.targetX=0;


this.targetY=0;




window.addEventListener(

"mousemove",

(e)=>{


this.targetX =

(
e.clientX /
window.innerWidth
-
0.5

)*0.5;




this.targetY =

(
e.clientY /
window.innerHeight
-
0.5

)*0.3;



}

);



}




update(){



this.camera.rotation.y +=

(
this.targetX -
this.camera.rotation.y

)

*

0.03;





this.camera.rotation.x +=

(
this.targetY -
this.camera.rotation.x

)

*

0.03;



}



}
