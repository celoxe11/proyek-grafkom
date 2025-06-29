import { initGame } from './game.js';
import { createSettingsPage } from './Setting.js';
import { AudioManager } from './Setting.js'; // pastikan AudioManager diexport

const audioManager = new AudioManager();

export function createHomepage() {
  const appElement = document.querySelector('#app');
  if (appElement) appElement.innerHTML = '';

  const container = document.createElement('div');
  container.style.cssText = `
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #1e4d2b, #2d936c, #18a558);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  `;

  // Style tag
  const style = document.createElement('style');
  style.textContent = `
    @keyframes gradientBG {
      0% { background-position: 0% 50% }
      50% { background-position: 100% 50% }
      100% { background-position: 0% 50% }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }
    .park-button {
      padding: 20px 40px;
      font-size: 24px;
      background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
      color: white;
      border: none;
      border-radius: 15px;
      cursor: pointer;
      margin: 10px;
      width: 280px;
      transition: all 0.3s ease;
      font-weight: bold;
    }
    .park-button:hover {
      transform: translateY(-5px);
    }
    .title-container {
      margin-bottom: 50px;
      text-align: center;
      animation: float 6s ease-in-out infinite;
    }
    .title {
      font-size: 82px;
      color: #fff;
      text-shadow: 2px 2px #000;
    }
    .subtitle {
      font-size: 24px;
      color: #fff;
    }
    .decoration {
      position: absolute;
      pointer-events: none;
      z-index: 0;
    }
  `;
  document.head.appendChild(style);

  // Title
  const titleContainer = document.createElement('div');
  titleContainer.className = 'title-container';

  const title = document.createElement('h1');
  title.className = 'title';
  title.textContent = 'Thrillscape';

  const subtitle = document.createElement('div');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'Your Virtual Theme Park Adventure';

  titleContainer.appendChild(title);
  titleContainer.appendChild(subtitle);

  // Menu
  const menuContainer = document.createElement('div');
  menuContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
    z-index: 1;
  `;

  const buttons = [
    {
      text: 'Play Now',
      action: () => {
        audioManager.openingMusic.pause();
        audioManager.openingMusic.currentTime = 0;

        audioManager.gameMusic.play().catch(err => {
          console.warn("Game music autoplay blocked:", err);
        });

        container.remove();
        document.body.innerHTML = '<div id="app"></div>';
        initGame();
      },
      gradient: 'linear-gradient(45deg, #ff6b6b, #ff8e8e)'
    },
    {
      text: 'Settings',
      action: () => {
        createSettingsPage(audioManager);
      },
      gradient: 'linear-gradient(45deg, #4CAF50, #81C784)'
    },
    {
      text: 'Collection',
      action: () => console.log('Collection clicked'),
      gradient: 'linear-gradient(45deg, #2196F3, #64B5F6)'
    },
    {
      text: 'Profile',
      action: () => console.log('Profile clicked'),
      gradient: 'linear-gradient(45deg, #9C27B0, #BA68C8)'
    }
  ];

  buttons.forEach(({ text, action, gradient }) => {
    const button = document.createElement('button');
    button.className = 'park-button';
    button.textContent = text;
    button.style.background = gradient;
    button.onclick = action;
    menuContainer.appendChild(button);
  });

  // Decorative emoji 🎡
  addDecorativeElements(container);

  // Auto play opening music
  audioManager.openingMusic.loop = true;
  audioManager.openingMusic.volume = audioManager.musicVolume;

  audioManager.openingMusic.play().catch(err => {
    console.warn("Autoplay gagal:", err);
    const unlock = () => {
      audioManager.openingMusic.play().catch(() => {});
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
  });

  // Final assemble
  container.appendChild(titleContainer);
  container.appendChild(menuContainer);
  appElement.appendChild(container);
}

// Decorations
function addDecorativeElements(container) {
  const decorations = [
    { emoji: '🎡', size: '80px', top: '10%', left: '10%', animation: '20s' },
    { emoji: '🎪', size: '60px', top: '20%', right: '15%', animation: '15s' },
    { emoji: '🎠', size: '70px', bottom: '15%', left: '15%', animation: '18s' },
    { emoji: '🎢', size: '75px', bottom: '20%', right: '10%', animation: '22s' },
  ];

  decorations.forEach(({ emoji, size, top, left, right, bottom, animation }) => {
    const element = document.createElement('div');
    element.className = 'decoration';
    element.style.cssText = `
      font-size: ${size};
      ${top ? `top: ${top};` : ''}
      ${left ? `left: ${left};` : ''}
      ${right ? `right: ${right};` : ''}
      ${bottom ? `bottom: ${bottom};` : ''}
      animation: float ${animation} ease-in-out infinite;
      opacity: 0.7;
    `;
    element.textContent = emoji; 
    container.appendChild(element);
  });
}
