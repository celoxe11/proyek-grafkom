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
    }

    async load(position = new THREE.Vector3()) {
        return new Promise((resolve, reject) => {
            const loader = new GLTFLoader();

            loader.load(this.modelPath, (gltf) => {
                this.model = gltf.scene;
                this.model.position.copy(position); // 💥 posisi final
                this.model.scale.set(10, 10, 10);
                this.model.userData.type = 'merry-go-round';
                this.model.userData.spinSpeed = this.spinSpeed;
                this.model.userData.isSpinning = this.isSpinning;
                this.model.userData.linkedInstance = this; // berguna untuk interaksi langsung dari scene
                this.scene.add(this.model);

                this.isLoaded = true;

                // Collider Box3 di PlaceableObject akan bekerja dengan .model
                resolve(this.model);
            }, undefined, (error) => {
                reject(error);
            });
        });
    }

    onInteraction() {
        this.isSpinning = !this.isSpinning;
        if (this.model) {
            this.model.userData.isSpinning = this.isSpinning;
        }
        console.log(`Merry-Go-Round is now ${this.isSpinning ? 'spinning' : 'stopped'}.`);
    }


    update(deltaTime) {
        super.update(deltaTime);

        if (this.isLoaded && this.isSpinning) {
            this.model.rotation.y += this.spinSpeed * (deltaTime * 60);
        }
    }
}
