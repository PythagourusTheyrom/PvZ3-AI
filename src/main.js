import './style.css'
import { Game } from './game/Game.js'
import { AssetLoader } from './game/graphics/AssetLoader.js'

document.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('game-canvas');
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  const uiLayer = document.getElementById('ui-layer'); // Added uiLayer as it's used later

  if (canvas) {
    const game = new Game(canvas);
    console.log('PvZ 3 Game Initialized');

    // Load Assets
    const assets = {
      'zombie_head': '/src/assets/zombie_head.png',
      'zombie_body': '/src/assets/zombie_body.png',
      'zombie_arm': '/src/assets/zombie_arm.png',
      'zombie_leg': '/src/assets/zombie_leg.png',
      'cone': '/src/assets/cone.png',
      'bucket': '/src/assets/bucket.png',
      'crazy_dave_head': '/src/assets/crazy_dave_head.png',
      'crazy_dave_body': '/src/assets/crazy_dave_body.png',
      'crazy_dave_arm': '/src/assets/crazy_dave_arm.png',
      'peashooter_head': '/src/assets/peashooter_head.png',
      'peashooter_leaf': '/src/assets/peashooter_leaf.png',
      'cherry_bomb': '/src/assets/cherry_bomb.png',
      'snow_pea': '/src/assets/snow_pea.png',
      'background': '/src/assets/background.png'
    };

    // Screens
    const seedSelectionScreen = document.getElementById('seed-selection-screen');
    const letsRockBtn = document.getElementById('lets-rock-btn');

    if (startBtn && startScreen && uiLayer && seedSelectionScreen) { // Ensure all elements exist
      console.log("Loading assets...");
      startBtn.disabled = true;
      startBtn.innerText = "Loading...";

      AssetLoader.loadAll(assets).then(() => {
        console.log("Assets loaded!");
        startBtn.disabled = false;
        startBtn.innerText = "Play Now";
      }).catch(e => {
        console.error("Failed to load assets", e);
        startBtn.innerText = "Error Loading";
      });

      // 1. Start Button Logic -> Go to Seed Selection
      startBtn.addEventListener('click', () => {
        startScreen.style.display = 'none';
        seedSelectionScreen.style.display = 'flex';
        seedSelectionScreen.classList.remove('hidden'); // Ensure logic matches CSS
      });

      // 2. Handle Seed Selection
      const selectedSeeds = new Set();
      const availableSeeds = document.querySelectorAll('.seed-card');

      availableSeeds.forEach(card => {
        card.addEventListener('click', () => {
          const plant = card.dataset.plant;
          if (selectedSeeds.has(plant)) {
            selectedSeeds.delete(plant);
            card.classList.remove('selected');
          } else {
            if (selectedSeeds.size < 5) { // Max 5 seeds
              selectedSeeds.add(plant);
              card.classList.add('selected');
            }
          }

          // Enable button if at least 1 seed selected
          if (selectedSeeds.size > 0 && letsRockBtn) {
            letsRockBtn.classList.remove('disabled');
          } else if (letsRockBtn) {
            letsRockBtn.classList.add('disabled');
          }
        });
      });

      // 3. Let's Rock -> Start Game
      if (letsRockBtn) {
        letsRockBtn.addEventListener('click', () => {
          if (selectedSeeds.size === 0) return;

          // Populate HUD based on selection
          const seedBar = document.getElementById('seed-bar');
          if (seedBar) {
            seedBar.innerHTML = ''; // Clear existing

            selectedSeeds.forEach(plantType => {
              const div = document.createElement('div');
              div.className = 'seed-packet';
              div.dataset.plant = plantType;

              // Cost lookup (Hardcoded for prototype simplicity)
              let cost = 50;
              if (plantType === 'peashooter') cost = 100;
              else if (plantType === 'cherrybomb') cost = 150;
              else if (plantType === 'snowpea') cost = 175;

              div.innerHTML = `<div class="seed-cost">${cost}</div>`;

              // Temp: Color code for visual distinction until assets loaded
              if (plantType === 'peashooter') div.style.backgroundColor = '#4ade80'; // Green tint
              if (plantType === 'sunflower') div.style.backgroundColor = '#facc15'; // Yellow tint
              if (plantType === 'wallnut') div.style.backgroundColor = '#a16207'; // Brown tint
              if (plantType === 'cherrybomb') div.style.backgroundColor = '#dc2626'; // Red tint
              if (plantType === 'snowpea') div.style.backgroundColor = '#60a5fa'; // Blue tint

              div.addEventListener('click', () => {
                game.selectedPlant = plantType;
                // Highlight
                document.querySelectorAll('.seed-packet').forEach(p => p.style.border = '2px solid var(--glass-border)');
                div.style.border = '2px solid var(--primary)';
              });

              seedBar.appendChild(div);
            });
          }

          seedSelectionScreen.style.display = 'none';
          uiLayer.style.display = 'block';

          // Auto-select first plant
          if (selectedSeeds.size > 0) {
            game.selectedPlant = Array.from(selectedSeeds)[0];
          }

          game.start();
          console.log('PvZ 3 Game Started');
        });
      }
    }


    // UI Interactions (Now handled dynamically)

    // Screen Buttons
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        game.reset();
        game.start();
      });
    }

    const nextLevelBtn = document.getElementById('next-level-btn');
    if (nextLevelBtn) {
      nextLevelBtn.addEventListener('click', () => {
        game.level++;
        game.reset();
        game.start();
      });
    }
  } else {
    console.error('Canvas element not found!');
  }
});
