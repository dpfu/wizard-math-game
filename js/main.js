import BootScene from './scenes/BootScene.js';
import StartScene from './scenes/StartScene.js';
import DifficultySelectScene from './scenes/DifficultySelectScene.js';
import LevelSelectScene from './scenes/LevelSelectScene.js';
import GameScene from './scenes/GameScene.js';
import StatisticsScene from './scenes/StatisticsScene.js'; // Import the new Statistics scene



// Phaser Game Configuration
const config = {
    type: Phaser.AUTO, // Automatically choose WebGL or Canvas
    width: 800,        // Width of the game canvas
    height: 600,       // Height of the game canvas
    parent: 'body',    // Attach canvas to the body element
    physics: {
        default: 'arcade', // Use the Arcade Physics engine
        arcade: {
            // debug: true, // Set true to see physics bodies and velocity vectors
            gravity: { y: 0 } // No downward gravity needed
        }
    },
    // List of scenes to include in the game
    // The first scene in the array is the one that starts automatically
    scene: [BootScene, StartScene, DifficultySelectScene, LevelSelectScene, GameScene, StatisticsScene]
};

// Create a new Phaser Game instance
const game = new Phaser.Game(config);


// Global fanfare utility
function playFanfare(scene) {
    const ctx = scene.sound.context;
    const now = ctx.currentTime;

    const notes = [
        { freq: 523.25, time: 0, duration: 0.3 },
        { freq: 659.25, time: 0.3, duration: 0.25 },
        { freq: 783.99, time: 0.6, duration: 0.5 }
    ];

    notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = note.freq;

        gain.gain.setValueAtTime(0.15, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration);
    });
}