import * as THREE from "three";

export default class Lights {

  constructor(scene) {

    // Key light - strong directional from upper-right front
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(2, 3, 6);
    scene.add(keyLight);

    // Fill light - softer from the left to reduce harsh shadows
    const fillLight = new THREE.DirectionalLight(0xdde4ff, 0.6);
    fillLight.position.set(-3, 1, 4);
    scene.add(fillLight);

    // Rim / back light - creates edge separation from background
    const rimLight = new THREE.DirectionalLight(0xaaccff, 1.0);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    // Warm accent from left - paints a gradient across the strip
    const warmLight = new THREE.PointLight(0xff7733, 14, 20);
    warmLight.position.set(-4, 2, 3.5);
    scene.add(warmLight);

    // Cool accent from right - cinematic contrast
    const coolLight = new THREE.PointLight(0x3377ff, 10, 20);
    coolLight.position.set(4, -1, 3.5);
    scene.add(coolLight);

    // Subtle center spot — soft & wide so the camera-facing area doesn't
    // read as a harsh hotspot
    const spotLight = new THREE.SpotLight(0xffffff, 4, 14, Math.PI / 5, 0.7);
    spotLight.position.set(0, 0.5, 5);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Low ambient base - keep shadows rich
    const ambient = new THREE.AmbientLight(0x445588, 0.4);
    scene.add(ambient);
  }
}
