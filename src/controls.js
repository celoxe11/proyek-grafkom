import * as THREE from "three";

export class PlayerControls {
  /**
   * Menggabungkan fitur terbaik dari kedua versi.
   * - Menggunakan model fisika (velocity, gravity, deltaTime) dari versi kedua untuk lompatan yang mulus.
   * - Menghilangkan ketergantungan pada 'modelLoader' dan logika tumbukan internal.
   * - Tumbukan sekarang ditangani oleh game loop utama yang memanggil 'rollbackPosition()'.
   * - Menyederhanakan logika gerakan untuk menangani input WASD secara efisien.
   */
  constructor(camera, cameraHolder, domElement) {
    this.camera = camera;
    this.cameraHolder = cameraHolder;
    this.domElement = domElement;

    // State Kontrol
    this.keysPressed = {};
    this.isLocked = false;
    
    // Parameter Gerakan
    this.speed = 0.5;
    this.mouseSpeed = 0.002;
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");
    
    // Parameter Fisika & Lompatan (Model dari file kedua, lebih baik)
    this.velocity = new THREE.Vector3();
    this.gravity = -20.0; // Gravitasi yang lebih terasa
    this.jumpHeight = 8.0; // Kekuatan lompatan awal
    this.isGrounded = true;
    this.groundLevel = 7.0; // Ketinggian default pemain di tanah
    
    // Untuk Rollback Tumbukan
    this.lastPosition = cameraHolder.position.clone();

    this.setupMouseControl();
    this.setupKeyboardControl();
  }

  setupMouseControl() {
    // Fungsi ini identik di kedua file, jadi tidak ada konflik.
    this.domElement.addEventListener("click", () => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener("mousemove", (event) => {
      if (!this.isLocked) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      // Rotasi horizontal (kiri/kanan) pada cameraHolder
      this.euler.y -= movementX * this.mouseSpeed;
      
      // Rotasi vertikal (atas/bawah) pada kamera, dengan batasan
      this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x - movementY * this.mouseSpeed));

      this.cameraHolder.rotation.y = this.euler.y;
      this.camera.rotation.x = this.euler.x;
    });
  }

  setupKeyboardControl() {
    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      this.keysPressed[key] = true;

      // Logika lompat dari file kedua, dipicu saat di darat
      if (key === " " && this.isGrounded) {
        this.velocity.y = this.jumpHeight;
        this.isGrounded = false;
      }
    });

    document.addEventListener("keyup", (event) => {
      this.keysPressed[event.key.toLowerCase()] = false;
    });
  }

  update(deltaTime) {
    if (!this.isLocked) return;

    // Simpan posisi terakhir SEBELUM bergerak, untuk rollback jika terjadi tumbukan.
    this.lastPosition.copy(this.cameraHolder.position);

    // --- Gerakan Horizontal (WASD) ---
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(this.camera.up, forward).normalize();
    
    const moveDirection = new THREE.Vector3();
    if (this.keysPressed["w"]) {
      moveDirection.add(forward);
    }
    if (this.keysPressed["s"]) {
      moveDirection.sub(forward);
    }
    if (this.keysPressed["a"]) {
      moveDirection.add(right);
    }
    if (this.keysPressed["d"]) { 
      moveDirection.sub(right);
    }
    
    // Normalisasi untuk kecepatan diagonal yang konsisten
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        this.cameraHolder.position.addScaledVector(moveDirection, this.speed);
    }

    // --- Gerakan Vertikal (Fisika & Lompatan) ---
    // Terapkan gravitasi (berbasis deltaTime untuk konsistensi)
    this.velocity.y += this.gravity * deltaTime;
    // Terapkan kecepatan vertikal ke posisi
    this.cameraHolder.position.y += this.velocity.y * deltaTime;

    // Cek jika pemain menyentuh tanah
    if (this.cameraHolder.position.y <= this.groundLevel) {
      this.cameraHolder.position.y = this.groundLevel;
      this.velocity.y = 0;
      this.isGrounded = true;
    }
  }

  /**
   * Mengembalikan pemain ke posisi valid terakhir.
   * Dipanggil dari luar (misal: game loop utama) setelah deteksi tumbukan.
   */
  rollbackPosition() {
    this.cameraHolder.position.copy(this.lastPosition);
  }
}