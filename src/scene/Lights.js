import * as THREE from "three";

export default class Lights {

  constructor(scene) {

    // Key light - strong directional from upper-right front
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 3, 6);
    scene.add(keyLight);

    // Fill light - softer from the left to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xdde4ff, 0.5);
    fillLight.position.set(-3, 1, 4);
    scene.add(fillLight);

    // Rim / back light - creates edge separation from background
    const rimLight = new THREE.DirectionalLight(0xaaccff, 0.8);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    // Warm accent from left - paints a gradient across the strip
    const warmLight = new THREE.PointLight(0xff8844, 10, 18);
    warmLight.position.set(-4, 2, 3.5);
    scene.add(warmLight);

    // Cool accent from right - cinematic contrast
    const coolLight = new THREE.PointLight(0x4488ff, 8, 18);
    coolLight.position.set(4, -1, 3.5);
    scene.add(coolLight);

    // Subtle center spot to highlight the active frame
    const spotLight = new THREE.SpotLight(0xffffff, 6, 12, Math.PI / 6, 0.5);
    spotLight.position.set(0, 0.5, 5);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Low ambient base - keep shadows rich
    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);
  }
}
