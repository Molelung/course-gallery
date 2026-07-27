export default class IntroAnimation{


constructor(object){


this.object = object;


this.duration = 3;


this.start =
performance.now();



this.finished=false;


}




update(){


if(this.finished)
return;



let elapsed =

(
performance.now()
-
this.start
)
/1000;



let t =

elapsed /
this.duration;



t =
Math.min(t,1);





// cubic ease

let ease =

1 -

Math.pow(

1-t,

3

);





this.object.position.z =

-8 +

ease*8;





this.object.scale.set(

0.2+

ease*0.8,


0.2+

ease*0.8,


0.2+

ease*0.8


);






if(t>=1){

this.finished=true;

}



}



}
