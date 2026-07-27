export default class ScrollAnimation{


constructor(object,camera){


this.object=object;


this.camera=camera;


this.progress=0;




window.addEventListener(

"scroll",

()=>{


let height =

document.body.scrollHeight
-
window.innerHeight;



this.progress =

window.scrollY /
height;



}

);



}



update(){



let p =
this.progress;




// 胶卷旋转


this.object.rotation.y =

p *

Math.PI *

2;




// 镜头推进


this.camera.position.z =

5 -

p*2;



}




}
