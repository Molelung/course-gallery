import * as THREE from "three";

export default function createDust() {
  const count = 1200;

  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(
      (Math.random() - 0.5) * 12,
      Math.random() * 6 - 1,
      (Math.random() - 0.5) * 12
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0x8899ff,
    size: 0.012,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const particles = new THREE.Points(geometry, material);
  return particles;
}
