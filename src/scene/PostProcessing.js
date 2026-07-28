import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/**
 * Cinematic vignette + subtle color grading shader (shader.se style).
 */
const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.45 },
    uSoftness: { value: 0.55 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uSoftness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vig = smoothstep(uSoftness, uSoftness - 0.35, dist);
      color.rgb *= mix(1.0 - uIntensity, 1.0, vig);
      color.rgb = pow(color.rgb, vec3(0.96));
      gl_FragColor = color;
    }
  `
};

export default class PostProcessing {

  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer.renderer);

    const renderPass = new RenderPass(scene, camera.camera);
    this.composer.addPass(renderPass);

    // Stronger bloom for cinematic glow
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55,   // strength
      0.5,    // radius
      0.2     // threshold
    );
    this.composer.addPass(bloom);

    // Cinematic vignette + color grade
    const cinematic = new ShaderPass(CinematicShader);
    this.composer.addPass(cinematic);
  }

  render() {
    this.composer.render();
  }

  resize() {
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
