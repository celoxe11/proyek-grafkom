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
    this.lastValidPosition = new THREE.Vector3();

    // Mouse movement
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.mouseSpeed = 0.002;

    // Setup event listeners
    this.setupMouseControl();
    this.setupKeyboardControl();

    this.velocity = new THREE.Vector3();
    this.gravity = -9.8;
    this.jumpSpeed = 8;
    this.isGrounded = true;
    this.lastPosition = cameraHolder.position.clone();
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
      const key = event.key.toLowerCase();
      this.keysPressed[key] = true;

      if (key === ' ' && this.isGrounded) {
        this.velocity.y = this.jumpSpeed;
        this.isGrounded = false;
      }
    });

    document.addEventListener('keyup', (event) => {
      this.keysPressed[event.key.toLowerCase()] = false;
    });
  }

  update(deltaTime) {
    if (!this.isLocked) return;

    this.lastPosition.copy(this.cameraHolder.position);

    // Movement direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cameraHolder.quaternion).setY(0).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.cameraHolder.quaternion).setY(0).normalize(); 

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

    this.velocity.y += this.gravity * deltaTime;
    this.cameraHolder.position.y += this.velocity.y * deltaTime;

    // Simple ground collision (example: y = 7 is ground level)
    if (this.cameraHolder.position.y <= 7) {
      this.cameraHolder.position.y = 7;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
  }

  rollbackPosition() {
    this.cameraHolder.position.copy(this.lastPosition);
  }
}
