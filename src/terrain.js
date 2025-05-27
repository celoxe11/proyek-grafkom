import * as THREE from "three";

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.createGround();
  }
  
  createGround() {
    // Ground texture setup
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load("/grass-texture-1154152.jpg");
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(200, 200);
    groundTexture.anisotropy = 16; // Will be limited by renderer capabilities later
    
    // Ground material and geometry setup
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 1.0,
      metalness: 0.0,
    });
    const groundGeometry = new THREE.PlaneGeometry(10000, 10000);
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }
  
  updateTextureSettings(renderer) {
    // Update anisotropy based on renderer capabilities
    const groundTexture = this.ground.material.map;
    if (groundTexture) {
      groundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      groundTexture.needsUpdate = true;
    }
  }
}
