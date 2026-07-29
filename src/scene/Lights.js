import * as THREE from "three";

export default class Lights {

  constructor(scene) {

    // Key light — moved OFF the face to the right side and dimmed down.
    // A hard frontal key used to wash the roll (and its paper label) out;
    // a softer SIDE key gives the celluloid its vintage modelling instead.
    const keyLight = new THREE.DirectionalLight(0xfff2e0, 0.85);
    keyLight.position.set(4.5, 2.5, 2.5);
    scene.add(keyLight);

    // Fill light - very soft from the left, keeps the shadow side readable
    const fillLight = new THREE.DirectionalLight(0xdde4ff, 0.4);
    fillLight.position.set(-3.5, 1, 3);
    scene.add(fillLight);

    // Rim / back light - creates edge separation from background
    const rimLight = new THREE.DirectionalLight(0xaaccff, 0.8);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    // Warm accent from the left — the vintage "tungsten" side of the grade
    const warmLight = new THREE.PointLight(0xff7733, 9, 20);
    warmLight.position.set(-4, 2, 3.5);
    scene.add(warmLight);

    // Cool accent from right - cinematic contrast
    const coolLight = new THREE.PointLight(0x3377ff, 7, 20);
    coolLight.position.set(4, -1, 3.5);
    scene.add(coolLight);

    // Subtle center spot — heavily tamed (was a frontal flood that blew
    // the roll out); now just a gentle lift so the centre never dies.
    const spotLight = new THREE.SpotLight(0xffffff, 1.3, 14, Math.PI / 5, 0.7);
    spotLight.position.set(0, 0.5, 5);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Low ambient base - keep shadows rich
    const ambient = new THREE.AmbientLight(0x445588, 0.3);
    scene.add(ambient);

    // Phones render the same scene harsher (small screen, tight fov, and
    // the key light lands right on the label). Give mobile a dedicated
    // grade: an almost PURE side key at lower intensity, a much weaker
    // frontal spot, and dimmer accents — the label ink stays readable.
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      keyLight.position.set(5.5, 1.5, 1.2);   // nearly 90° from the side
      keyLight.intensity = 0.55;
      spotLight.intensity = 0.7;
      warmLight.intensity = 6;
      coolLight.intensity = 5;
      fillLight.intensity = 0.3;
    }
  }
}
