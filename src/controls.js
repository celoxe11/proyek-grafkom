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

import * as THREE from "three";

export class PlayerControls {
  constructor(camera, cameraHolder, modelLoader) {
    this.camera = camera;
    this.cameraHolder = cameraHolder;
    this.modelLoader = modelLoader;
    this.keysPressed = {};
    this.speed = 0.5;
    this.lastCollisionCheck = 0;
    this.collisionCheckInterval = 100; // Check collisions every 100ms
    
    // Jump parameters - adjusted for slower jump
    this.isJumping = false;
    this.jumpHeight = 10; // Maximum height of jump in units
    this.jumpSpeed = 0;   // Current vertical velocity
    this.gravity = 0.15;  // Reduced gravity for slower descent
    this.initialJumpVelocity = 1.2; // Reduced initial velocity for slower ascent
    this.defaultHeight = 7; // Default player height when not jumping
    
    // Setup key listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    document.addEventListener("keydown", (event) => {
      this.keysPressed[event.key.toLowerCase()] = true;
      
      // Space key for jumping
      if (event.key === " " && !this.isJumping) {
        this.startJump();
      }
      
      // Toggle bounding boxes when 'b' key is pressed
      if (event.key.toLowerCase() === 'b' && this.modelLoader) {
        const isVisible = this.modelLoader.toggleBoundingBoxes();
        console.log(`Bounding boxes ${isVisible ? 'shown' : 'hidden'}`);
      }
    });
    
    document.addEventListener("keyup", (event) => {
      this.keysPressed[event.key.toLowerCase()] = false;
    });
    
    // Camera rotation
    let pitch = 0;
    
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === document.querySelector('canvas')) {
        document.addEventListener("mousemove", onMouseMove, false);
      } else {
        document.removeEventListener("mousemove", onMouseMove, false);
      }
    });
    
    const onMouseMove = (event) => {
      const sensitivity = 0.002;
      this.cameraHolder.rotation.y -= event.movementX * sensitivity; // yaw
      pitch -= event.movementY * sensitivity; // pitch
      
      // Clamp pitch between -90 and 90 degrees
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
      this.camera.rotation.x = pitch;
    };
  }
  
  startJump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpSpeed = this.initialJumpVelocity;
    }
  }
  
  updateJump() {
    if (this.isJumping) {
      // Update position based on current jump speed
      this.cameraHolder.position.y += this.jumpSpeed;
      
      // Apply gravity to slow down and eventually reverse the jump
      this.jumpSpeed -= this.gravity;
      
      // Check if we've landed
      if (this.cameraHolder.position.y <= this.defaultHeight) {
        this.cameraHolder.position.y = this.defaultHeight;
        this.isJumping = false;
        this.jumpSpeed = 0;
      }
    }
  }
  
  checkCollision() {
    // Only check collision periodically to improve performance
    const now = performance.now();
    if (now - this.lastCollisionCheck < this.collisionCheckInterval && this.lastCollisionCheck !== 0) {
      return false; // Skip collision check if not enough time has passed
    }
    this.lastCollisionCheck = now;
    
    // Create a simplified player collision cylinder
    const playerPosition = this.cameraHolder.position.clone();
    const playerRadius = 0.8; // Player "width"
    const playerHeight = 1.7; // Player height
    
    // Check for collision with any loaded model using the simplified volume
    if (this.modelLoader && this.modelLoader.checkCollisionCylinder(
      playerPosition,
      playerRadius,
      playerHeight
    )) {
      return true; // Collision detected
    }
    
    return false; // No collision
  }
  
  update() {
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    // Calculate direction based on yaw only
    this.camera.getWorldDirection(forward);
    forward.y = 0; // Ignore vertical movement
    forward.normalize();
    
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    
    // Handle movement with collision
    if (this.keysPressed["w"]) {
      // Move forward, check collision
      this.cameraHolder.position.addScaledVector(forward, this.speed);
      if (this.checkCollision()) {
        this.cameraHolder.position.subScaledVector(forward, this.speed);
      }
    }
    
    if (this.keysPressed["s"]) {
      // Move backward, check collision
      this.cameraHolder.position.addScaledVector(forward, -this.speed);
      if (this.checkCollision()) {
        this.cameraHolder.position.subScaledVector(forward, -this.speed);
      }
    }
    
    if (this.keysPressed["a"]) {
      // Move left, check collision
      this.cameraHolder.position.addScaledVector(right, this.speed);
      if (this.checkCollision()) {
        this.cameraHolder.position.subScaledVector(right, this.speed);
      }
    }
    
    if (this.keysPressed["d"]) {
      // Move right, check collision
      this.cameraHolder.position.addScaledVector(right, -this.speed);
      if (this.checkCollision()) {
        this.cameraHolder.position.subScaledVector(right, -this.speed);
      }
    }
    
    // Update jump physics
    this.updateJump();
    
    // Only enforce default height when not jumping
    if (!this.isJumping) {
      this.cameraHolder.position.y = this.defaultHeight;
    }
  }
}
