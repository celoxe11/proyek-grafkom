export function createSettingsPage(audioManager) {
  const app = document.querySelector("#app");
  if (app) app.innerHTML = "";

  const container = document.createElement("div");
  container.style.cssText = `
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #0a0a0a, #003300);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 50px;
    color: white;
    font-family: 'Poppins', sans-serif;
  `;

  const title = document.createElement("h1");
  title.textContent = "🎛️ Game Settings";
  title.style.cssText = `
    margin-bottom: 40px;
    font-size: 32px;
    text-shadow: 2px 2px 4px black;
  `;
  container.appendChild(title);

  // Panel Settings
  const panel = document.createElement("div");
  panel.style.cssText = `
    padding: 25px 30px;
    background-color: rgba(0,0,0,0.75);
    border: 2px solid #00cc88;
    border-radius: 15px;
    width: 320px;
    box-shadow: 0 0 15px rgba(0,255,136,0.2);
  `;

  // Music Volume
  panel.innerHTML += `
    <label style="display: block; margin-bottom: 6px;">🎵 Music Volume</label>
    <input type="range" id="music-volume" min="0" max="1" step="0.01" value="${audioManager.musicVolume}" style="width: 100%;" />
    <br/><br/>

    <label style="display: block; margin-bottom: 6px;">🔊 SFX Volume</label>
    <input type="range" id="sfx-volume" min="0" max="1" step="0.01" value="${audioManager.effectsVolume}" style="width: 100%;" />
    <br/><br/>

    <label><input type="checkbox" id="mute-music" ${audioManager.musicMuted ? "checked" : ""} /> Mute Music</label><br/>
    <label><input type="checkbox" id="mute-sfx" ${audioManager.effectsMuted ? "checked" : ""} /> Mute SFX</label>
  `;

  container.appendChild(panel);

  // Back Button
  const backButton = document.createElement("button");
  backButton.textContent = "⬅ Back to Game";
  backButton.style.cssText = `
    margin-top: 40px;
    padding: 12px 30px;
    background: #00cc88;
    color: white;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    transition: background 0.3s ease;
  `;
  backButton.onmouseover = () => backButton.style.background = "#00b378";
  backButton.onmouseout = () => backButton.style.background = "#00cc88";
  backButton.onclick = () => window.initGame();

  container.appendChild(backButton);
  app.appendChild(container);

  // Event listeners
  document.getElementById("music-volume").addEventListener("input", (e) => {
    audioManager.musicVolume = parseFloat(e.target.value);
    audioManager.applyVolumeSettings();
  });

  document.getElementById("sfx-volume").addEventListener("input", (e) => {
    audioManager.effectsVolume = parseFloat(e.target.value);
    audioManager.applyVolumeSettings();
  });

  document.getElementById("mute-music").addEventListener("change", (e) => {
    audioManager.musicMuted = e.target.checked;
    audioManager.applyVolumeSettings();
  });

  document.getElementById("mute-sfx").addEventListener("change", (e) => {
    audioManager.effectsMuted = e.target.checked;
    audioManager.applyVolumeSettings();
  });
}

export class AudioManager {
  constructor() {
    this.openingMusic = new Audio('./sound_effect/Opening.mp3');
    this.gameMusic = new Audio('./sound_effect/Game_sound.mp3');
    this.soundEffects = [];

    this.musicVolume = 0.5;
    this.effectsVolume = 0.5;
    this.musicMuted = false;
    this.effectsMuted = false;

    this.applyVolumeSettings();
  }

  applyVolumeSettings() {
    const musicVol = this.musicMuted ? 0 : this.musicVolume;
    if (this.openingMusic) this.openingMusic.volume = musicVol;
    if (this.gameMusic) this.gameMusic.volume = musicVol;

    this.soundEffects.forEach((sfx) => {
      if (sfx instanceof Audio) {
        sfx.volume = this.effectsMuted ? 0 : this.effectsVolume;
      }
    });
  }

  addSoundEffect(audio) {
    if (audio instanceof Audio) {
      this.soundEffects.push(audio);
      this.applyVolumeSettings();
    }
  }
}
