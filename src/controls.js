import * as THREE from "three";

export class PlayerControls {
  constructor(camera, cameraHolder, modelLoader, domElement) {
    this.camera = camera;
    this.cameraHolder = cameraHolder;
    this.modelLoader = modelLoader;
    this.domElement = domElement;
    this.keysPressed = {};
    this.speed = 0.5;
    this.isLocked = false;

    // Mouse movement
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.mouseSpeed = 0.002;

    // Setup event listeners
    this.setupMouseControl();
    this.setupKeyboardControl();
  }

  setupMouseControl() {
    // Click to start
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });

    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    // Mouse movement handler
    document.addEventListener('mousemove', (event) => {
      if (!this.isLocked) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      // Rotate camera holder (left/right)
      this.euler.y -= movementX * this.mouseSpeed;
      // Rotate camera (up/down)
      this.euler.x = Math.max(
        -Math.PI / 2, // Look up limit
        Math.min(
          Math.PI / 2, // Look down limit
          this.euler.x - movementY * this.mouseSpeed
        )
      );

      // Apply rotations
      this.cameraHolder.rotation.y = this.euler.y;
      this.camera.rotation.x = this.euler.x;
    });
  }

  setupKeyboardControl() {
    document.addEventListener('keydown', (event) => {
      this.keysPressed[event.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (event) => {
      this.keysPressed[event.key.toLowerCase()] = false;
    });
  }

  update(deltaTime) {
    if (!this.isLocked) return;

    // Movement direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraHolder.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraHolder.quaternion);
    right.normalize();

    // Movement
    if (this.keysPressed['w']) {
      this.cameraHolder.position.addScaledVector(forward, this.speed);
    }
    if (this.keysPressed['s']) {
      this.cameraHolder.position.addScaledVector(forward, -this.speed);
    }
    if (this.keysPressed['a']) {
      this.cameraHolder.position.addScaledVector(right, -this.speed);
    }
    if (this.keysPressed['d']) {
      this.cameraHolder.position.addScaledVector(right, this.speed);
    }
  }

  rollbackPosition() {
    // Implement if needed for collision
  }
}
