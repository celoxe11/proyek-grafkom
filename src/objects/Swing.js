import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlaceableObject } from "./PlaceableObject.js";

const loader = new GLTFLoader();

export class Swing extends PlaceableObject {
  constructor(scene) {
    super(scene);
    this.name = "Swing";
    this.modelPath = ""; // tidak digunakan karena model terpisah
    this.swingChairPath = "./swing/swing_chair.glb";
    this.swingHolderPath = "./swing/swing_holder.glb";

    this.holder = null;
    this.chair = null;
    this.swingPivot = null;

    this.swingSpeed = 0.02;
    this.swingAngle = 0;
    this.swingDirection = 1;
    this.isSwinging = false;
  }

  async load(
    position = new THREE.Vector3(), 
    scale = new THREE.Vector3(5, 5, 5), 
    rotation = new THREE.Euler()
  ) {
    const [holderGltf, chairGltf] = await Promise.all([
      loader.loadAsync(this.swingHolderPath),
      loader.loadAsync(this.swingChairPath),
    ]);

    this.holder = holderGltf.scene;
    this.chair = chairGltf.scene;

    // Buat pivot dan tambahkan kursi ke dalamnya
    this.swingPivot = new THREE.Object3D();
    this.swingPivot.add(this.chair);

    // Set posisi pivot di atas kursi
    this.swingPivot.position.set(0, 2.5, 0); // posisi gantungan
    this.chair.position.set(0, -2.5, 0);     // geser kursi ke bawah dari gantungan

    // Gabungkan semua
    const group = new THREE.Group();
    group.add(this.holder);
    group.add(this.swingPivot);

    group.position.copy(position);
    group.scale.copy(scale);
    group.rotation.copy(rotation);

    this.model = group;
    this.scene.add(group);
    this.model.userData.gameObject = this;

    this.createCollider();
    this.isLoaded = true;

    return group;
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.isSwinging && this.swingPivot) {
      this.swingAngle += this.swingDirection * this.swingSpeed;
      if (Math.abs(this.swingAngle) > 0.5) this.swingDirection *= -1;

      this.swingPivot.rotation.x = Math.sin(this.swingAngle) * 0.5;
    }
  }

  onInteraction() {
    this.isSwinging = !this.isSwinging;
  }
}
