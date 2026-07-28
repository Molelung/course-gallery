/**
 * Interaction - Subtle camera parallax based on mouse / touch / device orientation.
 * Decoupled from other animation modules.
 */
export default class Interaction {

  constructor(camera) {
    this.camera = camera;
    this.targetX = 0;
    this.targetY = 0;
    this.basePosition = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    this._isTouch = 'ontouchstart' in window;

    // Mouse parallax (desktop)
    window.addEventListener("mousemove", (e) => {
      this.targetX = (e.clientX / window.innerWidth - 0.5) * 0.3;
      this.targetY = (e.clientY / window.innerHeight - 0.5) * 0.15;
    });

    // Touch parallax (mobile) - gentle drift based on touch position
    if (this._isTouch) {
      window.addEventListener("touchmove", (e) => {
        if (e.touches.length !== 1) return;
        this.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 0.15;
        this.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 0.08;
      }, { passive: true });

      // Reset parallax when touch ends
      window.addEventListener("touchend", () => {
        this.targetX = 0;
        this.targetY = 0;
      }, { passive: true });
    }
  }

  update() {
    // Gentle parallax offset with smooth damping
    const lerp = this._isTouch ? 0.02 : 0.03;
    this.camera.position.x += (this.basePosition.x + this.targetX - this.camera.position.x) * lerp;
    this.camera.position.y += (this.basePosition.y - this.targetY - this.camera.position.y) * lerp;
    this.camera.lookAt(0, 0, 0);
  }
}
