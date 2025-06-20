import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

/**
 * Kelas dasar untuk semua objek yang dapat ditempatkan di dunia game.
 * Setiap objek yang mewarisi kelas ini akan bertanggung jawab atas dirinya sendiri.
 */
export class PlaceableObject {
  /**
   * @param {THREE.Scene} scene - Scene Three.js tempat objek akan ditambahkan.
   */
  constructor(scene) {
    if (this.constructor === PlaceableObject) {
      throw new Error(
        "PlaceableObject adalah kelas abstrak dan tidak bisa di-instantiate secara langsung."
      );
    }
    this.scene = scene;
    this.model = null; // Akan diisi setelah model dimuat
    this.collider = null; // Bounding box untuk deteksi tabrakan
    this.isLoaded = false;

    // Properti yang akan di-override oleh kelas turunan
    this.modelPath = ""; // Wajib diisi oleh kelas turunan
    this.name = "Unnamed Object"; // Bisa di-override
  }

  /**
   * Memuat model 3D untuk objek ini.
   * @param {THREE.Vector3} position - Posisi awal objek.
   * @param {THREE.Vector3} scale - Skala awal objek.
   * @param {THREE.Euler} rotation - Rotasi awal objek.
   * @returns {Promise<THREE.Group>} Promise yang resolve saat model selesai dimuat.
   */
  async load(
    position = new THREE.Vector3(0, 0, 0),
    scale = new THREE.Vector3(1, 1, 1),
    rotation = new THREE.Euler(0, 0, 0)
    ) {
    if (!this.modelPath) {
        throw new Error(`'modelPath' belum ditentukan untuk objek ${this.name}`);
    }

    try {
        const gltf = await loader.loadAsync(this.modelPath);
        this.model = gltf.scene;
        this.model.position.copy(position);
        this.model.scale.copy(scale);
        this.model.rotation.copy(rotation);

        this.model.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
        });

        this.model.userData.gameObject = this;
        this.createCollider();
        this.isLoaded = true;

        console.log(`${this.name} loaded at`, position);
        return this.model;
    } catch (error) {
        console.error(`Gagal memuat model untuk ${this.name}:`, error);
        throw error;
    }
    }


  /**
   * Membuat collider (area tabrakan) untuk objek ini.
   * Metode ini harus di-override jika butuh collider yang lebih spesifik.
   */
  createCollider() {
    if (!this.model) return;
    this.collider = new THREE.Box3().setFromObject(this.model);
    // Optional: Beri sedikit ruang ekstra pada collider
    this.collider.expandByScalar(0.2);
  }

  /**
   * Memeriksa tabrakan dengan collider lain.
   * @param {THREE.Box3} otherCollider - Collider milik objek lain (misal: pemain).
   * @returns {boolean} - True jika terjadi tabrakan.
   */
  checkCollision(otherCollider) {
    if (!this.collider || !this.isLoaded) return false;
    return this.collider.intersectsBox(otherCollider);
  }

  /**
   * Logika yang dijalankan setiap frame.
   * @param {number} deltaTime - Waktu sejak frame terakhir.
   */
  update(deltaTime) {
    // Metode ini bisa di-override oleh kelas turunan untuk animasi, dll.
    if (this.model && this.collider) {
      // Pastikan collider selalu update jika model bergerak
      this.collider.setFromObject(this.model);
    }
  }

  /**
   * Logika yang dijalankan saat pemain berinteraksi (misal: menekan 'E').
   */
  onInteraction() {
    // Metode ini harus di-override oleh kelas turunan.
    console.log(`Berinteraksi dengan ${this.name}`);
  }

  /**
   * Hapus objek dari scene.
   */
  // Di PlaceableObject.js
  dispose() {
    if (this.model && this.scene) {
      this.scene.remove(this.model); // Hapus dari scene

      // Bersihkan memori (opsional tapi bagus untuk performa)
      this.model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      this.model = null;
    }
  }
}
