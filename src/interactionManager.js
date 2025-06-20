import * as THREE from 'three';

export class InteractionManager {
  constructor(camera, scene, placedObjects = []) {
    this.camera = camera;
    this.scene = scene;
    this.placedObjects = placedObjects;
    this.interactableObjects = new Map();
    this.raycaster = new THREE.Raycaster();
    this.interactionDistance = 10;

    this.promptDiv = this.createPromptElement();
    document.body.appendChild(this.promptDiv);
  }

  createPromptElement() {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.top = '50%';
    el.style.left = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.color = '#00ff88';
    el.style.background = 'rgba(0, 0, 0, 0.8)';
    el.style.padding = '15px 30px';
    el.style.borderRadius = '10px';
    el.style.fontFamily = 'Arial, sans-serif';
    el.style.fontSize = '18px';
    el.style.fontWeight = 'bold';
    el.style.display = 'none';
    el.style.zIndex = '1000';
    el.style.border = '2px solid #00ff88';
    el.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.3)';
    el.style.textAlign = 'center';
    el.style.pointerEvents = 'none';
    return el;
  }

  /**
   * Tambahkan objek interaktif
   * @param {THREE.Object3D} object - Model yang akan dikenali raycaster
   * @param {string} name - Nama objek (untuk prompt)
   * @param {Function} interaction - Fungsi callback interaksi
   */
  addInteractableObject(object, name, interaction) {
    this.interactableObjects.set(object, {
      name,
      interaction,
      isAnimating: false
    });
  }

  /**
   * Update dipanggil setiap frame untuk deteksi interaksi
   * @param {THREE.Vector3} cameraPosition
   * @returns {object|null} nearby interaction object
   */
  update(cameraPosition) {
    const directions = [
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.5, 0, -1),
      new THREE.Vector3(-0.5, 0, -1),
      new THREE.Vector3(0, -0.5, -1),
    ];

    let nearest = null;
    let minDistance = this.interactionDistance;

    for (const dir of directions) {
      dir.applyQuaternion(this.camera.quaternion);
      this.raycaster.set(cameraPosition, dir.normalize());

      const hits = this.raycaster.intersectObjects([...this.interactableObjects.keys()], true);
      if (hits.length > 0 && hits[0].distance < minDistance) {
        const hitObject = this.findParentInteractable(hits[0].object);
        if (hitObject) {
          minDistance = hits[0].distance;
          nearest = {
            object: hitObject,
            info: this.interactableObjects.get(hitObject)
          };
        }
      }
    }

    if (nearest) {
      this.showPrompt(nearest.info.name);
      return nearest;
    }

    this.hidePrompt();
    return null;
  }

  showPrompt(name) {
    this.promptDiv.innerHTML = `
      <div style="margin-bottom: 5px;">🎡 ${name}</div>
      <div style="font-size: 14px;">Press <span style="color: #00ff88">E</span> to interact</div>
    `;
    this.promptDiv.style.display = 'block';
  }

  hidePrompt() {
    this.promptDiv.style.display = 'none';
  }

  /**
   * Menemukan root parent dari objek yang punya interaksi
   * @param {THREE.Object3D} object
   * @returns {THREE.Object3D|null}
   */
  findParentInteractable(object) {
    let current = object;
    while (current) {
      if (this.interactableObjects.has(current)) return current;
      current = current.parent;
    }
    return null;
  }

  /**
   * Dipanggil saat pemain menekan tombol interaksi
   * @param {{object: THREE.Object3D, info: object}} nearbyObject
   */
  handleInteraction(nearbyObject) {
    if (!nearbyObject) return;

    const entry = this.interactableObjects.get(nearbyObject.object);
    if (!entry || entry.isAnimating) return;

    entry.interaction(nearbyObject.object);
  }
}
