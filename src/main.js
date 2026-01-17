import './style.css'
import { Game } from './game/Game.js'
import { AssetLoader } from './game/graphics/AssetLoader.js'

// Asset Imports
import zombieHeadUrl from './assets/zombie_head.webp';
import zombieBodyUrl from './assets/zombie_body.webp';
import zombieArmUrl from './assets/zombie_arm.webp';
import zombieLegUrl from './assets/zombie_leg.webp';
import coneUrl from './assets/cone.webp';
import bucketUrl from './assets/bucket.webp';
import crazyDaveHeadUrl from './assets/crazy_dave_head.webp';
import crazyDaveBodyUrl from './assets/crazy_dave_body.webp';
import crazyDaveArmUrl from './assets/crazy_dave_arm.webp';
import peashooterHeadUrl from './assets/peashooter_head.webp';
import peashooterLeafUrl from './assets/peashooter_leaf.webp';
import cherryBombUrl from './assets/cherry_bomb.webp';
import snowPeaUrl from './assets/snow_pea.webp';
import backgroundUrl from './assets/background.webp';
import sunflowerUrl from './assets/sunflower.webp';
import wallnutUrl from './assets/wallnut.webp';
import potatoMineUrl from './assets/potatomine.webp';
import squashUrl from './assets/squash.webp';
import threepeaterUrl from './assets/threepeater.webp';
import repeaterUrl from './assets/repeater.webp';
import logoUrl from './assets/logo.webp';


document.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('game-canvas');
  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  const uiLayer = document.getElementById('ui-layer'); // Added uiLayer as it's used later

  if (canvas) {
    const game = new Game(canvas);
    window.game = game;
    console.log('PvZ 3 Game Initialized');

    // Load Assets
    const assets = {
      'zombie_head': zombieHeadUrl,
      'zombie_body': zombieBodyUrl,
      'zombie_arm': zombieArmUrl,
      'zombie_leg': zombieLegUrl,
      'cone': coneUrl,
      'bucket': bucketUrl,
      'crazy_dave_head': crazyDaveHeadUrl,
      'crazy_dave_body': crazyDaveBodyUrl,
      'crazy_dave_arm': crazyDaveArmUrl,
      'peashooter_head': peashooterHeadUrl,
      'peashooter_leaf': peashooterLeafUrl,
      'cherry_bomb': cherryBombUrl,
      'snow_pea': snowPeaUrl,
      'snow_pea': snowPeaUrl,
      'background': backgroundUrl,
      'sunflower': sunflowerUrl,
      'wallnut': wallnutUrl,
      'potatomine': potatoMineUrl,
      'squash': squashUrl,
      'threepeater': threepeaterUrl,
      'repeater': repeaterUrl,
      'logo': logoUrl
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
        startBtn.classList.remove('disabled'); // Ensure visual state
        startBtn.innerText = "Play Now";
      }).catch(e => {
        console.error("Failed to load assets", e);
        startBtn.innerText = "Error Loading";
      });

      // 1. Start Button Logic -> Go to Seed Selection
      startBtn.addEventListener('click', () => {
        console.log('Start Button Clicked!');
        game.isEndless = false; // Reset flag just in case
        startScreen.style.display = 'none';
        seedSelectionScreen.style.display = 'flex';
        seedSelectionScreen.classList.remove('hidden'); // Ensure logic matches CSS
      });

      // 1b. Endless Button Logic
      const endlessBtn = document.getElementById('endless-btn');
      if (endlessBtn) {
        endlessBtn.addEventListener('click', () => {
          console.log('Endless Button Clicked!');
          game.isEndless = true; // Set flag
          startScreen.style.display = 'none';
          seedSelectionScreen.style.display = 'flex';
          seedSelectionScreen.classList.remove('hidden');
        });
      }

      // 1c. Zen Garden Button Logic
      const zenGardenBtn = document.getElementById('zen-garden-btn');
      if (zenGardenBtn) {
        zenGardenBtn.addEventListener('click', () => {
          console.log('Zen Garden Button Clicked!');
          startScreen.style.display = 'none';
          uiLayer.style.display = 'block'; // Show UI (Sun/Seed bar or custom for Zen?)
          // For now, reuse Game UI but maybe hide seed bar if strictly viewing?
          // Let's just start the mode
          game.enterZenGarden();
        });
      }

      // 1c. Mod Maker & Animation Maker Buttons
      const modMakerBtn = document.getElementById('mod-maker-btn');
      if (modMakerBtn) {
        modMakerBtn.addEventListener('click', () => {
          window.open('modmaker/index.html', '_blank');
        });
      }

      const animMakerBtn = document.getElementById('anim-maker-btn');
      if (animMakerBtn) {
        animMakerBtn.addEventListener('click', () => {
          window.open('modmaker/animation.html', '_blank');
        });
      }

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
              else if (plantType === 'repeater') cost = 200;
              else if (plantType === 'potatomine') cost = 25;
              else if (plantType === 'threepeater') cost = 325;
              else if (plantType === 'squash') cost = 50;

              div.innerHTML = `<div class="seed-cost">${cost}</div>`;

              // Temp: Color code for visual distinction until assets loaded
              if (plantType === 'peashooter') div.style.backgroundColor = '#4ade80'; // Green tint
              if (plantType === 'sunflower') div.style.backgroundColor = '#facc15'; // Yellow tint
              if (plantType === 'wallnut') div.style.backgroundColor = '#a16207'; // Brown tint
              if (plantType === 'cherrybomb') div.style.backgroundColor = '#dc2626'; // Red tint
              if (plantType === 'snowpea') div.style.backgroundColor = '#60a5fa'; // Blue tint
              if (plantType === 'repeater') div.style.backgroundColor = '#22c55e'; // Green tint
              if (plantType === 'potatomine') div.style.backgroundColor = '#b45309'; // Brown tint
              if (plantType === 'threepeater') div.style.backgroundColor = '#10b981'; // Emerald
              if (plantType === 'squash') div.style.backgroundColor = '#f97316'; // Orange

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
