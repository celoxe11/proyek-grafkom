import { PlaceableObject } from "./PlaceableObject.js";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class MerryGoRound extends PlaceableObject {
    constructor(scene) {
        super(scene);
        this.modelPath = '../../public/old_roundabout_merry_go_round.glb';
        this.name = 'Merry-Go-Round';
        this.isSpinning = false;
        this.spinSpeed = 0.02;
        this.spinTimer = 0;

        this.collider = null; // 🧱 Tambahkan collider
    }

    async load(position = new THREE.Vector3()) {
        const loader = new GLTFLoader();

        return new Promise((resolve, reject) => {
            loader.load(this.modelPath, (gltf) => {
                this.model = gltf.scene;
                this.model.position.copy(position);
                this.model.scale.set(10, 10, 10);
                this.model.userData.type = 'merry-go-round';
                this.model.userData.spinSpeed = this.spinSpeed;
                this.model.userData.isSpinning = this.isSpinning;
                this.model.userData.linkedInstance = this;

                this.scene.add(this.model);
                this.createCollider(); // Buat collider setelah model dimuat
                this.isLoaded = true;
                resolve(this.model);
            }, undefined, (error) => {
                reject(error);
            });
        });
    }

    createCollider() {
        const box = new THREE.Box3().setFromObject(this.model);
        this.collider = box;
    }

    checkCollision(playerBox) {
        if (!this.collider) return false;
        return this.collider.intersectsBox(playerBox);
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.isSpinning && this.isLoaded) {
            this.model.rotation.y += this.spinSpeed * (deltaTime * 60);

            this.spinTimer -= deltaTime;
            if (this.spinTimer <= 0) {
                this.isSpinning = false;
                this.model.userData.isSpinning = false;
                console.log("Merry-Go-Round stopped spinning");
            }
        }

        // Update posisi collider jika model bergerak (jarang terjadi)
        if (this.model && this.collider) {
            this.collider.setFromObject(this.model);
            if (this.debugHelper) this.debugHelper.updateMatrixWorld(true); // update helper
        }
    }

    onInteraction() {
        if (!this.isSpinning) {
            this.isSpinning = true;
            this.spinTimer = 3;
            if (this.model) {
                this.model.userData.isSpinning = true;
            }
            console.log("Merry-Go-Round started spinning for 3 seconds");
        }
    }
}
