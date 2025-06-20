import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlaceableObject } from "./PlaceableObject.js";

const loader = new GLTFLoader();

export class Swing extends PlaceableObject {
  constructor(scene) {
    super(scene);
    this.name = "Swing";
    this.modelPath = "";
    this.swingChairPath = "./swing/swing_chair.glb";
    this.swingHolderPath = "./swing/swing_holder.glb";

    this.holder = null;
    this.chair = null;
    this.swingPivot = null;

    this.swingSpeed = 0.01;
    this.swingAngle = 0;
    this.swingDirection = 1;
    this.isSwinging = false;

    this.swingSound = null; // 🔊 Tambahkan properti sound
  }

  async load(position = new THREE.Vector3(), scale = new THREE.Vector3(5, 5, 5), rotation = new THREE.Euler()) {
    const [holderGltf, chairGltf] = await Promise.all([
      loader.loadAsync(this.swingHolderPath),
      loader.loadAsync(this.swingChairPath),
    ]);

    this.holder = holderGltf.scene;
    this.chair = chairGltf.scene;

    this.swingPivot = new THREE.Object3D();
    this.swingPivot.add(this.chair);
    this.swingPivot.position.set(0, 2.5, 0);
    this.chair.position.set(0, -2.5, 0);

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

    // 🔊 Load swing sound effect
    this.swingSound = new Audio('./sound_effect/swing_creak.mp3');
    this.swingSound.loop = true;
    this.swingSound.volume = 0.5;

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

    if (this.isSwinging) {
      if (this.swingSound && this.swingSound.paused) {
        this.swingSound.currentTime = 0;
        this.swingSound.play().catch(err => console.warn("Swing sound blocked:", err));
      }
    } else {
      if (this.swingSound && !this.swingSound.paused) {
        this.swingSound.pause();
        this.swingSound.currentTime = 0;
      }
    }
  }
}

