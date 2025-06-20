export class AudioSettings {
  constructor(openingMusic, gameMusic, soundEffects = []) {
    this.openingMusic = openingMusic;
    this.gameMusic = gameMusic;
    this.soundEffects = soundEffects;

    this.musicVolume = 0.5;
    this.effectsVolume = 0.5;
    this.musicMuted = false;
    this.effectsMuted = false;
  }

  createSettingsUI(parent) {
    const container = document.createElement('div');
    container.id = 'settings-panel';
    container.style.cssText = `
      padding: 20px;
      background-color: rgba(0,0,0,0.8);
      color: white;
      border-radius: 10px;
      font-family: sans-serif;
      width: 250px;
      margin-bottom: 20px;
    `;

    container.innerHTML = `
      <h3 style="margin-top: 0;">Audio Settings</h3>
      <label>🎵 Music Volume</label>
      <input type="range" min="0" max="1" step="0.01" value="${this.musicVolume}" id="music-volume" />
      <br/><br/>
      <label>🔊 SFX Volume</label>
      <input type="range" min="0" max="1" step="0.01" value="${this.effectsVolume}" id="sfx-volume" />
      <br/><br/>
      <label><input type="checkbox" id="mute-music" /> Mute Music</label><br/>
      <label><input type="checkbox" id="mute-sfx" /> Mute SFX</label>
    `;

    parent.appendChild(container);

    document.getElementById('music-volume').addEventListener('input', (e) => {
      this.musicVolume = parseFloat(e.target.value);
      this.applyVolumeSettings();
    });

    document.getElementById('sfx-volume').addEventListener('input', (e) => {
      this.effectsVolume = parseFloat(e.target.value);
      this.applyVolumeSettings();
    });

    document.getElementById('mute-music').addEventListener('change', (e) => {
      this.musicMuted = e.target.checked;
      this.applyVolumeSettings();
    });

    document.getElementById('mute-sfx').addEventListener('change', (e) => {
      this.effectsMuted = e.target.checked;
      this.applyVolumeSettings();
    });
  }

  applyVolumeSettings() {
    if (this.openingMusic) {
      this.openingMusic.volume = this.musicMuted ? 0 : this.musicVolume;
    }
    if (this.gameMusic) {
      this.gameMusic.volume = this.musicMuted ? 0 : this.musicVolume;
    }
    this.soundEffects.forEach((sfx) => {
      if (sfx instanceof Audio) {
        sfx.volume = this.effectsMuted ? 0 : this.effectsVolume;
      }
    });
  }
}

export function createSettingsPage(openingMusic, gameMusic, soundEffects = []) {
  const app = document.querySelector("#app");
  if (app) app.innerHTML = "";

  const container = document.createElement("div");
  container.style.cssText = `
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #000000, #003300);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: sans-serif;
  `;

  const title = document.createElement("h1");
  title.textContent = "🎛️ Settings";
  title.style.marginBottom = "20px";
  container.appendChild(title);

  // Buat dan tambahkan UI Audio Settings
  const audioSettings = new AudioSettings(openingMusic, gameMusic, soundEffects);
  audioSettings.createSettingsUI(container);

  const backButton = document.createElement("button");
  backButton.textContent = "⬅ Back to Game";
  backButton.style.cssText = `
    padding: 10px 20px;
    background: #00cc88;
    border: none;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    cursor: pointer;
    margin-top: 20px;
  `;
  backButton.onclick = () => {
    window.location.reload(); // atau panggil window.initGame()
  };

  container.appendChild(backButton);
  app.appendChild(container);
}
