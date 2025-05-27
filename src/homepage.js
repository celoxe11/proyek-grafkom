import { initGame } from './game.js';

export function createHomepage() {
    const appElement = document.querySelector('#app');
    if (appElement) appElement.innerHTML = '';

    // Add animated background
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

    // Add theme park decorative elements
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

        @keyframes shine {
            0% { background-position: -100% }
            100% { background-position: 200% }
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
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            text-transform: uppercase;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1;
        }

        .park-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 200%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.4),
                transparent
            );
            transition: 0.5s;
        }

        .park-button:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }

        .park-button:hover::before {
            left: 100%;
        }

        .park-button:active {
            transform: translateY(0px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .title-container {
            margin-bottom: 50px;
            text-align: center;
            animation: float 6s ease-in-out infinite;
        }

        .title {
            font-size: 82px;
            font-family: 'Arial Black', sans-serif;
            color: #fff;
            text-shadow: 
                0 0 10px rgba(255,255,255,0.5),
                2px 2px 0px #ff6b6b,
                -2px -2px 0px #4CAF50;
            margin: 0;
            letter-spacing: 4px;
        }

        .subtitle {
            font-size: 24px;
            color: #fff;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            margin-top: 10px;
        }

        .decoration {
            position: absolute;
            pointer-events: none;
            z-index: 0;
        }
    `;
    document.head.appendChild(style);

    // Create title with animation
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

    // Create menu container
    const menuContainer = document.createElement('div');
    menuContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        z-index: 1;
    `;

    // Create buttons with handlers
    const buttons = [
        { 
            text: 'Play Now', 
            action: () => {
                container.remove();
                document.body.innerHTML = '<div id="app"></div>';
                initGame();
            },
            gradient: 'linear-gradient(45deg, #ff6b6b, #ff8e8e)'
        },
        { 
            text: 'Settings', 
            action: () => console.log('Settings clicked'),
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
        button.textContent = text;
        button.className = 'park-button';
        button.style.background = gradient;
        button.onclick = (e) => {
            e.preventDefault();
            action();
        };
        menuContainer.appendChild(button);
    });

    // Add decorative elements
    addDecorativeElements(container);

    // Assemble page
    container.appendChild(titleContainer);
    container.appendChild(menuContainer);
    appElement.appendChild(container);
}

// Helper function to adjust color brightness
function adjustColor(color, amount) {
    return color.replace(/^#/, '').match(/.{2}/g)
        .map(c => Math.min(255, parseInt(c, 16) + amount).toString(16).padStart(2, '0'))
        .join('');
}

// Add decorative theme park elements
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
