import * as THREE from "three";



export default function createFilmMaterial(){



const material =

new THREE.ShaderMaterial({



transparent:true,


side:THREE.DoubleSide,



uniforms:{


uTime:{

value:0

},



uColor:{

value:new THREE.Color(
0x8a320d
)

}



},




vertexShader:`


varying vec3 vNormal;

varying vec3 vPosition;



void main(){



vNormal =

normalize(

normalMatrix *

normal

);



vPosition = position;



gl_Position =

projectionMatrix *

modelViewMatrix *

vec4(
position,
1.0
);



}



`,





fragmentShader:`



uniform vec3 uColor;

uniform float uTime;



varying vec3 vNormal;

varying vec3 vPosition;



float random(vec2 p){


return fract(

sin(

dot(

p,

vec2(
12.9898,
78.233

)

)

)

*

43758.5453

);



}





void main(){



// 边缘反射


float fresnel =

pow(

1.0 -

dot(

normalize(vNormal),

vec3(
0.0,
0.0,
1.0

)

),

3.0

);




// 胶片颗粒


float grain =

random(

vPosition.xy *

80.0

);





vec3 color =

uColor;



color +=

fresnel *

0.6;



color +=

grain *

0.08;




gl_FragColor =

vec4(

color,

0.55

);



}



`

});



return material;


}
