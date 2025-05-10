// Import enemy classes
import Shadow from '../sprites/Shadow.js';
import Ghost from '../sprites/Ghost.js';
import Plant from '../sprites/Plant.js';
// Import EXP Droplet REMOVED
// import ExpDroplet from '../sprites/ExpDroplet.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');

        // Player Health
        this.maxHearts = 3;
        this.currentHearts = 0; // Will be set in create
        this.invulnerable = false;
        this.invulnerableTimer = null;
        this.heartOutlines = [];
        this.hearts = [];

        // Game state variables
        this.wizard = null;
        this.enemies = null; // Physics group for enemies
        // this.projectiles = null; // Removed, using specific groups below
        // this.particles = null; // Removed
        this.isPausedForLevelUp = false; // Flag for level up pause state
        this.isPaused = false; // Flag for manual pause state

        // UI Elements
        this.questionText = null;
        this.inputText = null;
        this.scoreText = null;
        // Heart UI elements are properties above
        this.expBar = null; // NEW: EXP bar graphics
        this.expBarBg = null; // NEW: EXP bar background
        this.levelText = null; // NEW: Level display text
        this.levelUpContainer = null; // NEW: Container for level up UI
        this.pauseText = null; // Text display for manual pause

        // Gameplay Variables
        this.currentInput = '';
        this.currentQuestion = { num1: 0, num2: 0, answer: 0, operator: '' };
        this.score = 0;
        // Wave spawning variables
        this.waveSpawnTimer = null; // Timer for spawning enemies (Normal/Hard)
        this.practiceModeSpawnCheckTimer = null; // Spezieller Timer für den Practice Mode

        // this.enemySpeed = 45; // Removed - speed is now per-enemy
        this.gameOverLineX = 150; // X-coordinate where enemies trigger player damage
        this.isGameOver = false;
        this.selectedTables = [3]; // Default value, will be overwritten by init
        this.difficulty = 1; // Wird von LevelSelectScene gesetzt (0: Practice, 1: Normal, 2: Hard) 

        // Statistics Collection
        this.sessionStats = []; // Array to store stats
        this.questionStartTime = 0; // Timestamp for question timing

        // --- NEW: Leveling System ---
        this.playerLevel = 1;
        this.currentExp = 0;
        this.expToNextLevel = 3; // Initial EXP needed for level 2

        // --- NEW: Spell System ---
        this.spells = {
            // Fireball REMOVED
            ice: {
                level: 0,
                cooldown: 8000,
                lastCast: 0,
                duration: 3000 // ms freeze duration - INCREASED BASE DURATION
            }
        };
        this.spellKey = null; // To store the keyboard key for spells
        // this.fireballCooldownIcon = null; // REMOVED
        this.iceCooldownIcon = null;      // NEW: UI for ice cooldown
        this.pauseKey = null; // Key for manual pause

        // --- NEW: Physics Groups ---
        // this.expDroplets = null; // REMOVED
        // this.fireballs = null; // REMOVED
        this.allowedEnemyTypes = []; // Tracks enemies allowed in the current wave
        this.currentTargetEnemy = null; // NEW: The enemy the current question is attached to

        // --- Chapter System ---
        this.chapters = [
            {
                chapterNumber: 1,
                backgroundKey: 'background_dim',
                musicKey: 'gameMusic', // Dark_Forest.mp3
                enemiesToDefeat: 5,
                allowedEnemyTypes: [Ghost], // Start simple
                loreText: "Die dunkle Kammer ist gesäubert.\nIn der alten Bibliothek wartet\nneues Wissen!",
                allowEasyMultiplication: true
            },
            {
                chapterNumber: 2,
                backgroundKey: 'background_library',
                musicKey: 'homeMusic',
                enemiesToDefeat: 5,
                allowedEnemyTypes: [Ghost, Shadow],
                loreText: "Die Bücherflüche sind gebrochen.\nJetzt erwartet dich die\ngroße Halle!",
                allowEasyMultiplication: false
            },
            {
                chapterNumber: 3,
                backgroundKey: 'background_hall',
                musicKey: 'righteousSwordMusic',
                enemiesToDefeat: 5,
                allowedEnemyTypes: [Ghost, Shadow, Plant],
                loreText: "Die Hallen sind sicher!\nDraußen auf dem Feld lauert\nneue Gefahr.",
                allowEasyMultiplication: false
            },
            {
                chapterNumber: 4,
                backgroundKey: 'background_field',
                musicKey: 'jumpMusic',
                enemiesToDefeat: 5,
                allowedEnemyTypes: [Shadow, Plant], // More challenging mix
                loreText: "Das Feld ist ruhig.\nDoch dunkle Kräfte regen sich\nim Wald...",
                allowEasyMultiplication: false
            }
        ];
        this.currentChapterIndex = 0;
        this.enemiesDefeatedThisChapter = 0;
        this.chapterCompleteContainer = null;
        this.loreScreenContainer = null;
        this.backgroundSprite = null; // To hold the changeable background
        this.currentMusic = null; // To hold the current playing music instance
        this.isChapterTransitioning = false; // Flag for chapter transitions
        this.allowEasyMultiplication = true; // Will be set by chapter
    }

    // Initialize scene with data passed from the previous scene
    init(data) {
        console.log('GameScene init, received data:', data);
        // Use selected tables if passed, otherwise keep the default [3]
        if (data && data.selectedTables && data.selectedTables.length > 0) {
            this.selectedTables = data.selectedTables;
        } else {
            console.warn('No valid selectedTables received, defaulting to [3]');
            this.selectedTables = [3]; // Fallback if no data is passed
        }
        this.difficulty = data.difficulty;
        console.log('GameScene will use tables:', this.selectedTables);
        
        // --- Reset state on init ---
        this.playerLevel = 1;
        this.currentExp = 0;
        this.expToNextLevel = 3;
        this.isPausedForLevelUp = false;
        this.isPaused = false; // Reset manual pause state on init
        this.score = 0;
        // this.waveNumber = 0; // Wave number might be less relevant or reset per chapter
        this.sessionStats = [];
        // Reset spell levels and cooldowns if restarting
        // Fireball REMOVED
        this.spells.ice.level = 0;
        this.spells.ice.lastCast = 0;
        this.spells.ice.duration = 3000; // Reset duration to new base

        // --- Chapter Reset ---
        this.currentChapterIndex = 0;
        this.enemiesDefeatedThisChapter = 0;
        this.isChapterTransitioning = false;
        // Reset health etc. will happen in create()
    }


    create() {
        console.log('GameScene: create');
        this.isGameOver = false;
        this.invulnerable = false;
        this.currentHearts = this.maxHearts;
        this.isPausedForLevelUp = false; // Ensure reset here too
        this.isChapterTransitioning = false; // Reset flag

        // --- World Setup ---
        // Background - will be set by startChapter
        this.backgroundSprite = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'gameBackground').setOrigin(0.5);


        // Optional: Add a visual line for Game Over (debugging)
        // this.add.line(0, 0, this.gameOverLineX, 0, this.gameOverLineX, this.cameras.main.height, 0xff0000, 0.5).setOrigin(0);

        // --- Player Character ---
        // Place wizard on the left, bottom-aligned
        this.wizard = this.physics.add.sprite(100, this.cameras.main.height - 80, 'wizard') // Use physics.add.sprite
            .setOrigin(0.5, 1) // Origin bottom-center
            .setScale(2.5);    // Make wizard larger

        // --- Adjust Wizard Physics Body ---
        // Disable gravity for the wizard
        this.wizard.body.allowGravity = false;
        // Adjust the body size to better match the visual sprite (tweak as needed)
        // Since origin is bottom-center, offset needs careful adjustment
        const bodyWidth = this.wizard.width * 0.4 * this.wizard.scaleX; // Smaller collision width
        const bodyHeight = this.wizard.height * 0.7 * this.wizard.scaleY; // Adjust height
        this.wizard.body.setSize(bodyWidth, bodyHeight);
        // Offset Y upwards because origin is at the bottom
        this.wizard.body.setOffset(this.wizard.width * 0.5 - bodyWidth / 2, this.wizard.height - bodyHeight);

        this.wizard.play('wizard_idle'); // Start idle animation

        // Return to idle after casting
        this.wizard.on('animationcomplete', (animation) => {
            if (animation.key === 'wizard_cast') {
                this.wizard.play('wizard_idle');
            }
        });

        // --- Enemies ---
        // Create a physics group for enemies.
        // We will add instances of our custom Enemy classes to this group.
        // The classType helps Phaser know what kind of objects to expect,
        // although we'll be creating them manually anyway.
        this.enemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite, // Base type, actual instances vary
            runChildUpdate: true // Let enemies run their own update
        });

        // --- NEW: Physics Groups ---
        // Droplet group REMOVED
        // Fireball group REMOVED


        // --- UI Elements ---
        // Question Text (Will be positioned dynamically)
        this.questionText = this.add.text(0, 0, '', { // Start at 0,0, empty text
            fontSize: '28px', fill: '#ffffff', fontStyle: 'bold', // Slightly smaller font
            stroke: '#000000', strokeThickness: 4,
            align: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)', // Add background for readability
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5, 1).setDepth(10).setVisible(false); // Origin bottom-center, high depth, initially hidden

        // Input Text Display (Will be positioned dynamically)
        this.inputText = this.add.text(0, 0, '_', { // Start at 0,0
            fontSize: '24px', fill: '#FFD700', // Slightly smaller font
            fontStyle: 'bold',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 10, y: 5 },
            align: 'center'
        }).setOrigin(0.5, 1).setDepth(10).setVisible(false); // Origin bottom-center, high depth, initially hidden

        // Score Text (Top Right)
        this.score = 0; // Reset score on create
        this.scoreText = this.add.text(this.cameras.main.width - 20, 20, 'Score: 0', {
             fontSize: '28px', fill: '#ffffff', fontStyle: 'bold',
             stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0); // Align top-right

        // --- Health UI (Hearts) ---
        this.heartOutlines = [];
        this.hearts = [];
        const heartStartX = this.cameras.main.width - 40; // Start from right edge
        const heartY = 70; // Position below score
        const heartSpacing = 40;

        for (let i = 0; i < this.maxHearts; i++) {
            // Add outlines first (background)
            const outline = this.add.sprite(heartStartX - i * heartSpacing, heartY, 'heart').setOrigin(0.5);
            this.heartOutlines.push(outline);

            // Add filled hearts on top
            const fill = this.add.sprite(heartStartX - i * heartSpacing, heartY, 'heart-filled').setOrigin(0.5);
            this.hearts.push(fill);
        }
        this.updateHealthUI(); // Initial display based on currentHearts

        // --- NEW: EXP Bar UI ---
        const barWidth = 180;
        const barHeight = 18;
        const barX = 20;
        const barY = 20; // Position top-left

        this.expBarBg = this.add.graphics().setDepth(1);
        this.expBarBg.fillStyle(0x333333, 0.8); // Dark grey background
        this.expBarBg.fillRect(barX, barY, barWidth, barHeight);

        this.expBar = this.add.graphics().setDepth(2); // On top of background
        this.expBar.fillStyle(0x00ffff, 1); // Cyan color for EXP
        this.expBar.fillRect(barX, barY, 0, barHeight); // Start empty

        this.levelText = this.add.text(barX + barWidth / 2, barY + barHeight / 2, `Level: ${this.playerLevel}`, {
            fontSize: '14px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(3); // On top of the bar

        this.updateExpBar(); // Draw initial state

        // --- NEW: Spell Cooldown UI ---
        this.createSpellCooldownUI();


        // --- Input Handling ---
        this.input.keyboard.on('keydown', this.handleKeyInput, this);
        // Add key for casting spells
        this.spellKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        // Add key for pausing
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);


        // --- Initial Game State ---
        this.generateQuestion();
        this.currentInput = '';
        this.updateInputText();

        // --- Start Enemy Wave Spawning ---
        if (this.difficulty === 0) { // Practice Mode
            this.checkAndSpawnForPracticeMode();
        } else { // Normal or Hard Mode
            const initialSpawnDelay = this.difficulty === 2 ? 500 : 2000; // Hard mode starts faster
            if (this.waveSpawnTimer) this.waveSpawnTimer.remove(false);
            this.waveSpawnTimer = this.time.delayedCall(initialSpawnDelay, this.scheduleNextEnemySpawn, [], this);
            console.log(`Initial enemy spawn (Normal/Hard) scheduled in ${initialSpawnDelay / 1000}s`);
        }
        
        // --- NEW: Collisions / Overlaps ---
        // Droplet overlap REMOVED
        // Fireball overlap REMOVED

        // --- Level Up Screen (create hidden) ---
        this.createLevelUpScreen();
        this.createChapterCompleteScreen(); // Create new screen
        this.createLoreScreen(); // Create new screen

        // --- NEW: Pause Text (create hidden) ---
        this.pauseText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'PAUSED', {
            fontSize: '64px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(30).setVisible(false); // High depth, initially hidden

        // Fade in the scene
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Start the first chapter
        this.startChapter(this.currentChapterIndex);


         // --- Enable Physics Body for Droplets on Reuse --- REMOVED as expDroplets group is removed
         // Ensure the physics body is enabled when a droplet is reused from the pool
         // this.expDroplets.createCallback = (droplet) => {
         //     droplet.body?.setEnable(true);
         // };
         // Also handle removal (disable body when pooled)
         // this.expDroplets.removeCallback = (droplet) => {
         //     droplet.body?.setEnable(false);
         // };
    }

    update(time, delta) {
        // --- Check for Game Over ---
        if (this.isGameOver) {
            return;
        }

        // --- Handle Manual Pause Input ---
        // Allow pausing only if not already paused for level up or chapter transition
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey) && !this.isPausedForLevelUp && !this.isChapterTransitioning) {
            this.togglePause();
        }

        // --- Check for ALL pause states ---
        if (this.isPaused || this.isPausedForLevelUp || this.isChapterTransitioning) {
            // Optional: Could add visual indication of pause like dimming
            return; // Skip updates if game over or paused
        }


        // --- Enemy Movement and Checks ---
        // Enemies now run their own update via the group config
        // We still need to check for crossing the line here
        // Check for player damage
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) {
                // --- Player Damage Check ---
                if (enemy.x < this.gameOverLineX && !this.invulnerable) {
                    this.playerTakeDamage(enemy); // Player takes damage
                    // Note: playerTakeDamage handles invulnerability timing
                }
            }
        });

        // --- NEW: Spell Casting Input ---
        if (Phaser.Input.Keyboard.JustDown(this.spellKey)) {
            // Only check for Ice spell now
            if (this.spells.ice.level > 0 && time > this.spells.ice.lastCast + this.spells.ice.cooldown) {
                this.castIceSpell(time);
            }
        }

        // Fireball update logic REMOVED

        // --- NEW: Update Spell Cooldown UI ---
        this.updateSpellCooldownUI(time);

        // --- NEW: Update Floating Calculation UI ---
        this.updateFloatingUI();
    }

    // --- Player Health and Damage ---

    playerTakeDamage(enemy) {
        if (this.isGameOver || this.invulnerable) {
            return; // Already game over or recently hit
        }

        console.log('Player hit!');
        this.currentHearts--;
        this.updateHealthUI();

        // Make player invulnerable for a short time
        this.invulnerable = true;
        this.wizard.setAlpha(0.5); // Visual feedback for invulnerability

        // Play hurt sound
        this.sound.play('wrongSound'); // Maybe use a different sound?
        this.cameras.main.shake(150, 0.008); // Shake camera

        // Destroy the enemy that hit the player
        if (enemy && enemy.active) {
            enemy.destroy();
        }

        // Set timer to end invulnerability
        if (this.invulnerableTimer) {
            this.invulnerableTimer.remove(false); // Remove previous timer if any
        }
        this.invulnerableTimer = this.time.delayedCall(1500, () => { // 1.5 seconds invulnerability
            this.invulnerable = false;
            this.wizard.setAlpha(1.0); // Restore wizard visibility
            console.log('Player invulnerability ended.');
        }, [], this);


        // Check for actual game over (no hearts left)
        if (this.currentHearts <= 0) {
            this.triggerGameOver();
        }
    }

    updateHealthUI() {
        // Update visibility of filled hearts based on currentHearts
        for (let i = 0; i < this.maxHearts; i++) {
            // Hearts array is filled right-to-left visually (index 0 is rightmost)
            // Player loses hearts from right to left
            if (i < this.currentHearts) {
                this.hearts[i].setVisible(true);
            } else {
                this.hearts[i].setVisible(false);
            }
        }
    }

    // --- Input and Answer Handling ---

    handleKeyInput(event) {
        // --- Ignore input if paused or game over ---
        if (this.isGameOver || this.isPausedForLevelUp || this.isPaused) {
            return;
        }

        // Handle number input (0-9)
        if (event.key >= '0' && event.key <= '9') {
             // Limit input length (e.g., max 3 digits)
            if (this.currentInput.length < 3) {
                this.currentInput += event.key;
            }
        }
        // Handle Backspace
        else if (event.key === 'Backspace') {
            this.currentInput = this.currentInput.slice(0, -1); // Remove last character
        }
        // Handle Enter key to submit answer
        else if (event.key === 'Enter' && this.currentInput.length > 0) {
            this.checkAnswer();
            this.currentInput = ''; // Clear input field after submitting
        }

        // Update the displayed input text
        this.updateInputText();
    }

    updateInputText() {
        // Show underscore as placeholder if input is empty, otherwise show the input
        this.inputText.setText(this.currentInput || '_');
        // Ensure visibility matches question text
        this.inputText.setVisible(this.questionText.visible);
    }

    generateQuestion() {
        // --- NEW: Target Selection ---
        // Only generate a new question if there isn't already an active target
        if (this.currentTargetEnemy && this.currentTargetEnemy.active) {
            console.log("generateQuestion called but current target is still active.");
            return;
        }

        // Find potential targets: active enemies reasonably far from the left edge
        const potentialTargets = this.enemies.getChildren().filter(e =>
            e.active && e.x > this.gameOverLineX + 100 // Ensure they are not too close to game over line
        );

        if (potentialTargets.length === 0) {
            console.log("No suitable enemy target found for new question.");
            this.currentTargetEnemy = null;
            this.questionText.setVisible(false); // Hide UI if no target
            this.inputText.setVisible(false);
            return; // Wait until an enemy appears
        }

        // Select a random enemy from the potential targets
        this.currentTargetEnemy = Phaser.Math.RND.pick(potentialTargets);
        console.log(`New target selected: ${this.currentTargetEnemy.constructor.name} at x: ${this.currentTargetEnemy.x.toFixed(0)}`);

        // --- Question Generation (existing logic) ---
        const Operator = {
            MULTIPLY: '×',
            ADD: '+',
            SUBTRACT: '−',
        };

        const operatorKeys = Object.keys(Operator);
        const randomOperatorKey = operatorKeys[Phaser.Math.Between(0, operatorKeys.length - 1)];
        const operatorSymbol = Operator[randomOperatorKey];
        let num1, num2;

        switch (operatorSymbol) {
            case Operator.MULTIPLY:
                num1 = Phaser.Math.RND.pick(this.selectedTables);
                do {
                    num2 = Phaser.Math.Between(1, 10);
                } while (!this.allowEasyMultiplication && (num1 === 1 || num2 === 1) && this.selectedTables.length > 1); // Ensure not 1xY or Xx1 if not allowed and more than just table of 1 selected

                this.currentQuestion.num1 = num1;
                this.currentQuestion.num2 = num2;
                this.currentQuestion.operator = operatorSymbol;
                this.currentQuestion.answer = this.currentQuestion.num1 * this.currentQuestion.num2;
                break;
            case Operator.ADD:
                num1 = Phaser.Math.Between(1,100); // Keep original logic for ADD/SUBTRACT
                num2 = Phaser.Math.Between(0,99-num1);
                this.currentQuestion.num1 = num1;
                this.currentQuestion.num2 = num2;
                this.currentQuestion.operator = operatorSymbol;                 
                this.currentQuestion.answer = this.currentQuestion.num1 + this.currentQuestion.num2;
                break;
            case Operator.SUBTRACT:
                // Stelle sicher, dass num1 die größere Zahl ist und das Ergebnis nicht negativ ist
                num1 = Phaser.Math.Between(1, 100); // Minuend
                num2 = Phaser.Math.Between(0, num1); // Subtrahend (muss <= num1 sein, kann 0 sein)
                this.currentQuestion.num1 = num1;
                this.currentQuestion.num2 = num2;
                this.currentQuestion.operator = operatorSymbol;
                this.currentQuestion.answer = this.currentQuestion.num1 - this.currentQuestion.num2;
                break;
        }

        // Display question
        this.questionText.setText(`${this.currentQuestion.num1} ${operatorSymbol} ${this.currentQuestion.num2} = ?`);
        this.questionText.setVisible(true);
        this.inputText.setVisible(true);
        this.updateInputText();
        
        // Debug log
        console.log(`New question: ${num1} ${operatorSymbol} ${num2} = ${this.currentQuestion.answer}`);

        // Record start time for this question
        this.questionStartTime = Date.now();
    }

    checkAnswer() {
        const timeTaken = Date.now() - this.questionStartTime;
        const playerAnswerStr = this.currentInput; // Keep the raw input
        const playerAnswerNum = parseInt(playerAnswerStr); // Attempt to parse
        const correctAnswer = this.currentQuestion.answer;
        const isCorrect = !isNaN(playerAnswerNum) && playerAnswerNum === correctAnswer;

        // Record the attempt
        this.sessionStats.push({
            num1: this.currentQuestion.num1,
            num2: this.currentQuestion.num2,
            answerGiven: playerAnswerStr, // Store the raw string input
            correctAnswer: correctAnswer,
            timeTaken: timeTaken,
            correct: isCorrect
        });

        console.log(`Attempt recorded: ${this.currentQuestion.num1}x${this.currentQuestion.num2}, Given: ${playerAnswerStr}, Correct: ${correctAnswer}, Time: ${timeTaken}ms, Result: ${isCorrect}`);

        // Check if the parsed number is valid and matches the correct answer
        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            // Pass the parsed answer attempt for potential feedback, though we might not use it
            this.handleWrongAnswer(playerAnswerNum);
        }
        // Clear input field after submitting (moved here to happen regardless of correct/wrong)
        this.currentInput = '';
        this.updateInputText(); // Update display after clearing
    }

    handleCorrectAnswer() {
        console.log('Correct!');
        this.sound.play('correctSound'); // Play correct answer sound

        // Play wizard casting animation
        this.wizard.play('wizard_cast');

        // Increase score
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);

        // --- Attack the CURRENT TARGET Enemy ---
        if (this.currentTargetEnemy && this.currentTargetEnemy.active) {
            const targetEnemy = this.currentTargetEnemy; // Use the stored target
            console.log(`Attacking target ${targetEnemy.constructor.name} at x: ${targetEnemy.x.toFixed(0)}`);

            // Play cast sound
            this.sound.play('castSound');

            // --- Create Lightning Effect ---
            // --- Create Lightning Effect ---
            // Estimate wand position (adjust offsets as needed)
            const wandX = this.wizard.x + 20; // Slightly right of wizard center
            const wandY = this.wizard.y - 60; // Above wizard center

            // Calculate target position based on the target enemy's visual center
            const bounds = targetEnemy.getBounds();
            const targetX = bounds.centerX;
            const targetY = bounds.centerY + Phaser.Math.Between(-10, 10); // Add jitter

            this.createLightning(wandX, wandY, targetX, targetY);


            // --- Damage the Target Enemy ---
            const defeated = targetEnemy.takeDamage(1); // Deal 1 damage

            if (defeated) {
                // Target Enemy was defeated by this hit
                console.log(`Target ${targetEnemy.constructor.name} defeated by attack.`);
                this.sound.play('enemyHitSound', { delay: 0.15 }); // Play death sound

                // Increase score
                this.score += 10; // Score for defeating the target
                this.scoreText.setText('Score: ' + this.score);

                // --- Chapter Progress ---
                this.enemiesDefeatedThisChapter++;
                console.log(`Enemies defeated this chapter: ${this.enemiesDefeatedThisChapter}/${this.chapters[this.currentChapterIndex].enemiesToDefeat}`);

                if (this.enemiesDefeatedThisChapter >= this.chapters[this.currentChapterIndex].enemiesToDefeat) {
                    this.completeChapter();
                } else {
                    // --- NEW: Clear target and generate next question ---
                    this.currentTargetEnemy = null; // Clear the defeated target
                    this.questionText.setVisible(false); // Hide UI temporarily
                    this.inputText.setVisible(false);
                    // Schedule the next question generation after a short delay
                    this.time.delayedCall(750, this.generateQuestion, [], this); // Delay allows death effects to play
                }

            } else {
                // Target Enemy was hit but survived (e.g., Plant)
                console.log(`Target ${targetEnemy.constructor.name} survived the hit.`);
                // Keep the same target and question, DO NOT generate a new one yet.
                // Play a different, less impactful hit sound?
                // this.sound.play('hitSound', { volume: 0.5 });
            }

        } else {
            console.log('Correct answer, but the target enemy is no longer active.');
            // Clear the invalid target and try to generate a new question immediately
            this.currentTargetEnemy = null;
            this.generateQuestion();
        }
    }

    handleWrongAnswer() {
        console.log('Wrong!');
        // Provide feedback to the player
        // Shake the camera slightly
        this.cameras.main.shake(150, 0.008); // duration, intensity

        // Flash the input text red
        this.inputText.setFill('#ff0000'); // Red
        this.time.delayedCall(300, () => {
            this.inputText.setFill('#FFD700'); // Back to gold
        });

        // Play a 'wrong' sound effect
        this.sound.play('wrongSound');

        // Do NOT generate a new question - let the player retry
        // Optional: Make enemies move slightly faster or closer? (Handled by enemy update now)
        // We could temporarily boost speed here if desired:
        // this.enemies.getChildren().forEach(enemy => {
        //     if (enemy) enemy.x -= 10; // Small nudge forward
        // });
    }

    // --- Visual Effects ---

    /**
     * Creates a lightning bolt effect from a start point to an end point.
     * @param {number} startX - The starting X coordinate.
     * @param {number} startY - The starting Y coordinate.
     * @param {number} endX - The ending X coordinate (enemy center X).
     * @param {number} endY - The ending Y coordinate (enemy center Y with jitter).
     */
    createLightning(startX, startY, endX, endY) {
        const segments = 12; // More segments for smoother animation/jitter
        const jitter = 15;   // Max pixel offset for the zigzag
        const duration = 75; // Total duration for the lightning animation (ms)
        const delayBetweenSegments = duration / segments;
        const glowColor = 0xffff88; // Soft yellow for glow
        const glowAlpha = 0.25;
        const glowWidth = 10;
        const mainColor = 0xFFFF00; // Bright yellow for main bolt
        const mainAlpha = 1.0;
        const mainWidth = 3;
        const impactShakeDuration = 80;
        const impactShakeIntensity = 0.005;
        const fadeOutDuration = 100; // How long the bolt stays visible after drawing

        // --- Generate Points ---
        const points = [];
        points.push(new Phaser.Math.Vector2(startX, startY)); // Start point

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            // Base position using linear interpolation
            let x = Phaser.Math.Linear(startX, endX, t);
            let y = Phaser.Math.Linear(startY, endY, t);
            // Add random jitter, except for the very start and end points
            if (i < segments) {
                x += Phaser.Math.Between(-jitter, jitter);
                y += Phaser.Math.Between(-jitter, jitter);
            }
            points.push(new Phaser.Math.Vector2(x, y));
        }

        // --- Create Graphics Objects ---
        // Glow layer (drawn first, underneath)
        const glowGraphics = this.add.graphics().setDepth(5); // Ensure glow is behind main bolt if needed
        glowGraphics.lineStyle(glowWidth, glowColor, glowAlpha);

        // Main lightning bolt layer
        const lightningGraphics = this.add.graphics().setDepth(6); // Ensure main bolt is on top
        lightningGraphics.lineStyle(mainWidth, mainColor, mainAlpha);

        // --- Animate Drawing ---
        let currentSegment = 0;
        const drawSegment = () => {
            if (currentSegment >= points.length - 1) {
                // Animation finished
                // Play impact sound (reuse castSound or add a dedicated 'zap' sound)
                this.sound.play('castSound', { volume: 0.6 }); // Consider a unique sound: 'zapSound'
                // Optional: Camera shake on impact
                this.cameras.main.shake(impactShakeDuration, impactShakeIntensity);

                // Set a timer to destroy the graphics after a short delay
                this.time.delayedCall(fadeOutDuration, () => {
                    glowGraphics.destroy();
                    lightningGraphics.destroy();
                });
                return; // Stop the loop
            }

            const p1 = points[currentSegment];
            const p2 = points[currentSegment + 1];

            // Draw segment on both graphics objects
            glowGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
            lightningGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));

            currentSegment++;
        };

        // Use a timed event to call drawSegment repeatedly
        this.time.addEvent({
            delay: delayBetweenSegments,
            callback: drawSegment,
            callbackScope: this,
            repeat: segments // Run 'segments' times to draw all lines between the points
        });
    }


    // --- Wave Management & Enemy Spawning (New Difficulty Logic) ---

    checkAndSpawnForPracticeMode() {
        if (this.isGameOver || this.isPausedForLevelUp || this.isPaused || this.isChapterTransitioning) {
            if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.paused = true;
            return;
        }
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.paused = false;

        if (this.enemies.countActive(true) === 0) {
            console.log("Practice Mode: Spawning new enemy.");
            const enemyType = this.chooseEnemyType();
            this.spawnEnemy(enemyType);
        }
        // Schedule the next check
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.remove(false);
        this.practiceModeSpawnCheckTimer = this.time.delayedCall(1000, this.checkAndSpawnForPracticeMode, [], this); // Check every 1 second
    }

    scheduleNextEnemySpawn() {
        if (this.isGameOver || this.isPausedForLevelUp || this.isPaused || this.isChapterTransitioning) {
            if (this.waveSpawnTimer) this.waveSpawnTimer.paused = true;
            return;
        }
        if (this.waveSpawnTimer) this.waveSpawnTimer.paused = false;
        if (this.difficulty === 0) return; // Practice mode uses checkAndSpawnForPracticeMode

        let canSpawn = false;
        let spawnInterval = 0;

        if (this.difficulty === 1) { // Normal Mode
            spawnInterval = 3000; // Spawn attempt every 3 seconds
            if (this.enemies.countActive(true) < 3) {
                canSpawn = true;
            } else {
                // console.log("Normal Mode: Max 3 enemies active, skipping spawn attempt.");
            }
        } else if (this.difficulty === 2) { // Hard Mode
            spawnInterval = 1500; // Spawn attempt every 1.5 seconds
            canSpawn = true; // Always attempt to spawn
        } else {
            console.warn(`scheduleNextEnemySpawn called with unknown difficulty: ${this.difficulty}`);
            return; // Should not happen
        }

        if (canSpawn) {
            console.log(`Difficulty ${this.difficulty}: Attempting to spawn enemy.`);
            const enemyType = this.chooseEnemyType();
            this.spawnEnemy(enemyType);
        }

        // Schedule the next spawn attempt
        if (this.waveSpawnTimer) this.waveSpawnTimer.remove(false);
        this.waveSpawnTimer = this.time.delayedCall(spawnInterval, this.scheduleNextEnemySpawn, [], this);
    }

    // --- Individual Enemy Spawning ---

    chooseEnemyType() {
        // Choose randomly ONLY from the types allowed in the current chapter
        const currentChapterConfig = this.chapters[this.currentChapterIndex];
        const chapterAllowedTypes = currentChapterConfig.allowedEnemyTypes;

        if (!chapterAllowedTypes || chapterAllowedTypes.length === 0) {
            console.warn("No allowed enemy types defined for this chapter! Defaulting to Ghost.");
            return Ghost; // Fallback
        }
        
        return Phaser.Math.RND.pick(chapterAllowedTypes);
    }

    spawnEnemy(EnemyClass) {
        // This function now creates a single enemy instance of the specified class

        if (!EnemyClass) {
            console.error("No EnemyClass provided to spawnEnemy!");
            return null;
        }

        // Calculate spawn position: off-screen right, vertically aligned with wizard's base
        const yPos = this.cameras.main.height - 80; // Match wizard Y pos
        const startX = this.cameras.main.width + Phaser.Math.Between(50, 100); // Start varied off-screen right

        // Create an instance of the specific enemy class
        // The 'difficulty' parameter is passed to the enemy constructor,
        // in case it's used for HP or other non-speed attributes in the future.
        const enemy = new EnemyClass(this, startX, yPos, this.difficulty);

        // Adjust enemy movement speed based on difficulty
        const speedMap = [30, 45, 70]; // Practice, Normal, Hard (as per design doc)
        let finalSpeed = speedMap[this.difficulty] !== undefined ? speedMap[this.difficulty] : speedMap[1]; // Default to Normal speed if difficulty is unexpectedly undefined

        // The Enemy base class uses 'moveSpeed' property in its update loop.
        enemy.moveSpeed = finalSpeed;
        // The Enemy's originalSpeed is set in its constructor from config.moveSpeed.
        // We update originalSpeed here as well, as moveSpeed is set directly after creation.
        enemy.originalSpeed = finalSpeed;

        // Add the enemy to the physics group
        this.enemies.add(enemy);

        console.log(`Spawned ${enemy.constructor.name} with speed ${finalSpeed} (Difficulty: ${this.difficulty})`);
        return enemy; // Return the spawned enemy instance
    }

    triggerGameOver() { // Removed enemy parameter - triggered by health loss now
        // Prevent this function from running multiple times
        if (this.isGameOver) {
            return;
        }
        this.isGameOver = true;
        console.log('Game Over! Enemy reached the wizard.');

        // Stop everything
        this.physics.pause(); // Stop all physics movement
        // Stop wave timers
        if (this.waveSpawnTimer) {
            this.waveSpawnTimer.remove(false);
            this.waveSpawnTimer = null;
        }
        if (this.practiceModeSpawnCheckTimer) { // Clear practice mode timer
            this.practiceModeSpawnCheckTimer.remove(false);
            this.practiceModeSpawnCheckTimer = null;
        }
        // Stop enemy updates and animations
        this.enemies.getChildren().forEach(e => {
            if (e.active) {
                e.body.stop(); // Stop physics body
                e.anims?.stop(); // Stop animation
            }
        });
        this.wizard.anims.stop();

        if (this.pauseKey) this.pauseKey.enabled = false;
        // Hide floating UI
        this.questionText.setVisible(false);
        this.inputText.setVisible(false);


        // Visual feedback
        this.cameras.main.shake(300, 0.015);
        this.wizard.setTint(0xff6666); // Tint wizard slightly red
        // Don't tint specific enemy anymore, it's triggered by health loss

        // Stop background music and play game over sound
        this.sound.stopAll();
        this.sound.play('gameOverSound');

        // Display Game Over message
        this.add.rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2, 500, 200, 0x000000, 0.8)
           .setOrigin(0.5)
           .setDepth(10); // Ensure it's on top

        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 40, 'GAME OVER', {
            fontSize: '64px', fill: '#ff0000', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5).setDepth(11);

        // Removed 'Click to Restart' text - using buttons now

         // --- High Score Logic (using localStorage) ---
         let highScore = parseInt(localStorage.getItem('mathGameHighScore') || '0');
         if (this.score > highScore) {
            highScore = this.score;
            localStorage.setItem('mathGameHighScore', highScore.toString());
            // Add text indicating new high score
             this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 80, `New High Score: ${highScore}`, {
                  fontSize: '24px', fill: '#FFD700' // Gold color
              }).setOrigin(0.5).setDepth(11);
         } else {
             // Show current and high score
              this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 80, `High Score: ${highScore}`, {
                  fontSize: '24px', fill: '#ffffff'
              }).setOrigin(0.5).setDepth(11);
         }

        // --- Action Buttons ---
        const buttonY = this.cameras.main.height / 2 + 130; // Position below high score
        const buttonSpacing = 200;

        // Play Again Button
        const againButton = this.add.text(this.cameras.main.width / 2 - buttonSpacing / 2, buttonY, 'Play Again', {
            fontSize: '32px', fill: '#0f0', backgroundColor: '#333', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(11).setInteractive();

        againButton.on('pointerdown', () => {
            console.log('Restarting game from Game Over...');
            this.sound.stopAll();
            this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
                if (progress === 1) {
                    // Pass the original selected tables back when restarting
                    // Reset necessary game state variables before restarting
                    this.scene.restart({ difficulty: this.difficulty, selectedTables: this.selectedTables });
                }
            });
        });
        againButton.on('pointerover', () => againButton.setStyle({ fill: '#8f8' }));
        againButton.on('pointerout', () => againButton.setStyle({ fill: '#0f0' }));


        // Statistics Button
        const statsButton = this.add.text(this.cameras.main.width / 2 + buttonSpacing / 2, buttonY, 'Statistics', {
            fontSize: '32px', fill: '#ff0', backgroundColor: '#333', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(11).setInteractive();

        statsButton.on('pointerdown', () => {
            console.log('Going to Statistics scene...');
            this.sound.stopAll();
            // Pass session data and selected tables to the Statistics Scene
            const statsData = {
                sessionStats: this.sessionStats,
                selectedTables: this.selectedTables // Pass selected tables too
            };
            // Use scene.start, not restart, to go to a different scene
            this.scene.start('StatisticsScene', statsData);
        });
        statsButton.on('pointerover', () => statsButton.setStyle({ fill: '#ff8' }));
        statsButton.on('pointerout', () => statsButton.setStyle({ fill: '#ff0' }));


        // Disable player input until buttons are ready (slight delay to prevent accidental clicks)
        // Note: Keyboard input was already disabled earlier in triggerGameOver
        // This ensures pointer input is also disabled until buttons appear.
        this.input.enabled = false;
        this.time.delayedCall(500, () => {
             this.input.enabled = true;
             console.log("Pointer input re-enabled for Game Over buttons.");
        });

    } // End triggerGameOver


    // =============================================
    // --- NEW: EXP and Leveling Methods ---
    // =============================================

    // spawnExpDroplet REMOVED
    // collectExpDroplet REMOVED

    // Renamed from gainExp - now called directly when enemy dies
    gainExp(amount) {
        if (this.isGameOver || this.isPausedForLevelUp) return; // Don't gain EXP if paused or game over

        this.currentExp += amount;
        console.log(`Gained ${amount} EXP. Total: ${this.currentExp}/${this.expToNextLevel}`);
        this.updateExpBar(); // Update the visual bar

        // Check for level up (can level up multiple times from one collection)
        while (this.currentExp >= this.expToNextLevel && !this.isPausedForLevelUp) {
             // Check pause flag again in case multiple level ups happen quickly
            this.levelUp();
        }
    }

    updateExpBar() {
        if (!this.expBar || !this.expBarBg || !this.levelText) return; // Check if UI exists

        this.expBar.clear();
        this.expBar.fillStyle(0x00ffff, 1); // Cyan EXP color

        // Calculate percentage, ensuring it's between 0 and 1
        const percentage = Phaser.Math.Clamp(this.currentExp / this.expToNextLevel, 0, 1);
        const barWidth = 180; // Must match the width used in create()
        const barHeight = 18; // Must match height
        const barX = 20; // Must match X
        const barY = 20; // Must match Y
        const currentBarWidth = barWidth * percentage;

        this.expBar.fillRect(barX, barY, currentBarWidth, barHeight);

        // Update level text as well
        this.levelText.setText(`Level: ${this.playerLevel}`);
    }

    levelUp() {
        // Prevent level up if already paused (e.g., from a previous level up this frame)
        if (this.isPausedForLevelUp) return;

        this.currentExp -= this.expToNextLevel; // Subtract cost, keep remainder
        this.playerLevel++;

        // Increase EXP requirement for the *next* level
        // Example: Needs 3, then 3+4=7, then 7+5=12, then 12+6=18 etc.
        this.expToNextLevel += (this.playerLevel + 1);

        console.log(`%cLEVEL UP! Reached Level ${this.playerLevel}. Next level at ${this.expToNextLevel} EXP. Remainder: ${this.currentExp}`, 'color: yellow; font-weight: bold;');

        this.updateExpBar(); // Update bar with new values (shows remainder EXP)

        // --- Trigger Level Up Screen ---
        this.pauseForLevelUp();
        this.showLevelUpScreen();

        // Optional: Add visual/audio feedback for level up (flash, sound)
        // this.sound.play('levelUpSound'); // Add sound when available
        this.cameras.main.flash(250, 255, 255, 0); // White flash
    }

    // =============================================
    // --- NEW: Pause and Level Up Screen Methods ---
    // =============================================

    pauseForLevelUp() {
        if (this.isPausedForLevelUp) return; // Already paused

        console.log("Pausing game for Level Up selection.");
        this.isPausedForLevelUp = true;
        // Disable manual pause while level up screen is shown
        if (this.isPaused) {
            this.resumeGame(); // Ensure manual pause is undone if active
        }

        // Pause physics simulation
        this.physics.world.pause();

        // Pause wave timers explicitly
        if (this.waveSpawnTimer) this.waveSpawnTimer.paused = true;
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.paused = true;

        // Pause individual enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active && typeof enemy.pause === 'function') {
                enemy.pause();
            }
        });

        // Pause projectiles/droplets movement REMOVED
        // this.expDroplets.getChildren().forEach(d => d.body?.stop());
        // this.fireballs.getChildren().forEach(f => f.body?.stop()); // REMOVED

        // Pause player animations
        this.wizard.anims.pause();
    }

    resumeAfterLevelUp() {
        if (!this.isPausedForLevelUp) return; // Not paused

        console.log("Resuming game after Level Up selection.");
        this.isPausedForLevelUp = false;
        // Resume physics simulation (manual pause state remains false)
        this.physics.world.resume();

        // Resume wave timers
        if (this.waveSpawnTimer) this.waveSpawnTimer.paused = false;
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.paused = false;

        // Resume individual enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active && typeof enemy.resume === 'function') {
                enemy.resume();
            }
        });

         // Resume projectiles/droplets movement REMOVED
         // this.expDroplets.getChildren().forEach(droplet => {
         //     if (droplet.active) {
         //         // Restart movement towards player if it hasn't reached yet
         //         this.physics.moveToObject(droplet, this.wizard, droplet.moveSpeed);
         //     }
         // });
         // Fireball resume logic REMOVED

         // Resume player animation
         this.wizard.anims.resume();
         // Ensure idle animation plays if nothing else is overriding it
         if (this.wizard.anims.currentAnim?.key !== 'wizard_cast') {
             this.wizard.play('wizard_idle', true);
         }
    }

    createLevelUpScreen() {
        // Create container but keep it hidden
        this.levelUpContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2)
            .setDepth(20) // Ensure it's on top of everything
            .setVisible(false);

        // Background panel using graphics
        const bg = this.add.graphics()
            .fillStyle(0x111144, 0.9) // Dark blue, mostly opaque
            .fillRoundedRect(-250, -180, 500, 360, 15) // Centered rectangle
            .lineStyle(3, 0xeeeeff, 1)
            .strokeRoundedRect(-250, -180, 500, 360, 15);

        // Title
        const title = this.add.text(0, -140, 'Level Up!', {
            fontSize: '40px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        // --- Upgrade Option Buttons ---
        const buttonStyle = {
            fontSize: '24px', fill: '#fff', backgroundColor: '#00008B', // Dark blue background
            padding: { x: 15, y: 10 },
            fixedWidth: 350, // Ensure buttons have same width
            align: 'center',
            fontStyle: 'bold'
        };
        const buttonHoverStyle = { fill: '#add8e6' }; // Light blue on hover

        // Fireball Button REMOVED

        // Ice Spell Button - Position adjusted to center vertically
        const iceButton = this.add.text(0, 0, '', buttonStyle) // Centered Y
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        iceButton.on('pointerdown', () => this.selectUpgrade('ice'));
        iceButton.on('pointerover', () => iceButton.setStyle(buttonHoverStyle));
        iceButton.on('pointerout', () => iceButton.setStyle({ fill: '#fff' })); // Reset color

        // Add elements to the container
        this.levelUpContainer.add([bg, title, iceButton]); // Only add ice button

        // Store references to buttons for easy text updates
        // this.levelUpContainer.setData('fireballButton', fireballButton); // REMOVED
        this.levelUpContainer.setData('iceButton', iceButton);
    }

    showLevelUpScreen() {
        if (!this.levelUpContainer) return;

        // const fireballButton = this.levelUpContainer.getData('fireballButton'); // REMOVED
        const iceButton = this.levelUpContainer.getData('iceButton');

        // Update button text based on current spell levels
        // const fbLevel = this.spells.fireball.level; // REMOVED
        const iceLevel = this.spells.ice.level;

        // const fbDesc = ` (CD: ${this.spells.fireball.cooldown/1000}s, Dmg: ${this.spells.fireball.damage})`; // REMOVED
        const iceDesc = ` (CD: ${this.spells.ice.cooldown/1000}s, Dur: ${this.spells.ice.duration/1000}s)`;

        // fireballButton.setText(fbLevel === 0 ? 'Learn Fireball' : `Upgrade Fireball (Lvl ${fbLevel + 1})` + fbDesc); // REMOVED
        iceButton.setText(iceLevel === 0 ? 'Learn Ice Spell' : `Upgrade Ice Spell (Lvl ${iceLevel + 1})` + iceDesc);

        this.levelUpContainer.setVisible(true);
        // Optional: Add a tween animation for appearing
        this.levelUpContainer.setScale(0.8).setAlpha(0.5);
        this.tweens.add({
            targets: this.levelUpContainer,
            scale: 1.0,
            alpha: 1.0,
            duration: 200,
            ease: 'Back.easeOut' // A little bounce effect
        });
    }

    selectUpgrade(spellKey) {
        // Ensure screen is visible and game is paused before selecting
        // Also ensure only 'ice' spell can be selected now
        if (spellKey !== 'ice' || !this.spells[spellKey] || !this.isPausedForLevelUp || !this.levelUpContainer.visible) return;

        this.spells[spellKey].level++; // Increment level
        console.log(`Selected upgrade: ${spellKey}, now level ${this.spells[spellKey].level}`);

        // Apply the actual upgrade effects
        this.applySpellUpgrade(spellKey);

        // Hide the screen and resume game
        this.levelUpContainer.setVisible(false);
        this.resumeAfterLevelUp();
    }

    applySpellUpgrade(spellKey) {
        const spell = this.spells[spellKey];
        if (!spell) return;

        const level = spell.level; // Current level *after* incrementing

        // Apply upgrades based on the new level
        if (spellKey === 'ice') {
            // Example: Reduce cooldown, increase duration
            spell.cooldown = Math.max(2000, 9000 - (level * 1000)); // Faster cooldown per level (min 2s)
            spell.duration = 3000 + (level * 750); // Longer freeze per level - INCREASED DURATION PER LEVEL
            console.log(`Ice Spell upgraded: Cooldown ${spell.cooldown}ms, Duration ${spell.duration}ms`);
        }

        // Update UI immediately after upgrade to show the icon if just learned
        this.updateSpellCooldownUI(this.time.now);
    }


    // =============================================
    // --- NEW: Spell Casting Methods ---
    // =============================================

    // castFireball, checkFireballHitEnemy, hitEnemyWithFireball REMOVED

    castIceSpell(time) {
        console.log("Casting Ice Spell!");
        this.spells.ice.lastCast = time; // Record cast time
        // this.sound.play('iceSound'); // Play specific ice sound when available

        // --- NEW: Update Cooldown UI immediately ---
        this.updateSpellCooldownUI(time);

        // Play wizard cast animation
        this.wizard.play('wizard_cast', true);

        const freezeDuration = this.spells.ice.duration;

        // Visual effect: Screen flash blue + temporary frost overlay?
        this.cameras.main.flash(150, 100, 150, 255); // Blue-ish flash
        const frost = this.add.graphics()
            .fillStyle(0xadd8e6, 0.2) // Light blue, semi-transparent
            .fillRect(0, 0, this.cameras.main.width, this.cameras.main.height)
            .setDepth(15); // High depth
        this.time.delayedCall(300, () => frost.destroy()); // Remove frost effect


        // Apply freeze to all active enemies
        this.enemies.getChildren().forEach(enemy => {
            // Check enemy is active and has the freeze method
            if (enemy.active && typeof enemy.freeze === 'function') {
                enemy.freeze(freezeDuration);
            }
        });
    }


    // =============================================
    // --- NEW: Spell Cooldown UI Methods ---
    // =============================================

    createSpellCooldownUI() {
        const iconSize = 50;
        const padding = 15;
        const startY = 60; // Below EXP bar
        const iconX = padding + iconSize / 2;

        // Fireball Icon REMOVED

        // --- Ice Icon ---
        // Position adjusted to where Fireball icon was
        this.iceCooldownIcon = this.add.container(iconX, startY).setDepth(5).setVisible(false);
        const iceBg = this.add.graphics().fillStyle(0x00008B, 0.7).fillCircle(0, 0, iconSize / 2); // Dark blue background
        // Placeholder graphics for ice icon
        const iceIconGraphics = this.add.graphics()
            .fillStyle(0xadd8e6) // Light blue
            .fillCircle(0, 0, iconSize * 0.35) // Smaller inner circle
            .lineStyle(2, 0xffffff)
            .strokeCircle(0, 0, iconSize * 0.35);
        const iceMaskShape = this.make.graphics();
        this.iceCooldownIcon.add([iceBg, iceIconGraphics, iceMaskShape]);
        this.iceCooldownIcon.setData('mask', iceMaskShape);
        iceIconGraphics.mask = new Phaser.Display.Masks.GeometryMask(this, iceMaskShape);
        iceIconGraphics.mask.invertAlpha = true;

        // Initial update
        this.updateSpellCooldownUI(this.time.now);
    }

    updateSpellCooldownUI(time) {
        const iconSize = 50;

        // Fireball UI update REMOVED

        // --- Ice ---
        const iceSpell = this.spells.ice;
        if (iceSpell.level > 0) {
            this.iceCooldownIcon.setVisible(true);
            const elapsed = time - iceSpell.lastCast;
            const progress = Phaser.Math.Clamp(elapsed / iceSpell.cooldown, 0, 1);
            const mask = this.iceCooldownIcon.getData('mask');
            mask.clear();
            if (progress < 1) {
                mask.fillStyle(0xffffff);
                mask.slice(0, 0, iconSize / 2, Phaser.Math.DegToRad(270), Phaser.Math.DegToRad(270 + (1 - progress) * 360), true);
                mask.fillPath();
            }
        } else {
            this.iceCooldownIcon.setVisible(false);
        }
    }


    // =============================================
    // --- NEW: Manual Pause Methods ---
    // =============================================

    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            // Do not allow pausing if level up screen is active
            if (!this.isPausedForLevelUp) {
                this.pauseGame();
            }
        }
    }

    pauseGame() {
        if (this.isPaused || this.isPausedForLevelUp || this.isGameOver) return; // Prevent pausing if already paused/leveling/game over

        console.log("Game Paused Manually");
        this.isPaused = true;
        this.pauseText.setVisible(true);
        // Hide calculation UI if not already hidden by another system
        if (!this.isChapterTransitioning && !this.isPausedForLevelUp) {
            this.questionText.setVisible(false);
            this.inputText.setVisible(false);
        }

        // Pause physics
        this.physics.world.pause();

        // Pause timers
        if (this.waveSpawnTimer) this.waveSpawnTimer.paused = true;
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.paused = true;
        if (this.invulnerableTimer) this.invulnerableTimer.paused = true; // Pause invulnerability timer

        // Pause animations/movement for player and enemies
        this.wizard.anims?.pause();
        this.enemies.getChildren().forEach(enemy => enemy.pause()); // Use existing pause method
        // Droplet pause logic REMOVED
        // this.fireballs.getChildren().forEach(f => f.body?.stop()); // REMOVED

        // Optional: Lower music volume
        const music = this.sound.get('gameMusic');
        if (music?.isPlaying) {
            music.setVolume(0.1); // Lower volume significantly
        }
    }

    resumeGame() {
        if (!this.isPaused || this.isPausedForLevelUp || this.isGameOver) return; // Prevent resuming if not paused or leveling/game over

        console.log("Game Resumed Manually");
        this.isPaused = false;
        this.pauseText.setVisible(false);
        // Show calculation UI if appropriate (e.g., not in chapter transition)
        if (!this.isChapterTransitioning && !this.isPausedForLevelUp && this.currentTargetEnemy && this.currentTargetEnemy.active) {
            this.questionText.setVisible(true);
            this.inputText.setVisible(true);
        }

        // Resume physics
        this.physics.world.resume();

        // Resume timers
        if (this.waveSpawnTimer) this.waveSpawnTimer.paused = false;
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.paused = false;
        if (this.invulnerableTimer) this.invulnerableTimer.paused = false; // Resume invulnerability timer

        // Resume animations/movement
        this.wizard.anims?.resume();
        this.enemies.getChildren().forEach(enemy => enemy.resume()); // Use existing resume method
        // Restart movement for droplets REMOVED
         // Fireball resume logic REMOVED

        // Optional: Restore music volume
        const music = this.sound.get('gameMusic');
        if (music?.isPlaying) {
            music.setVolume(0.4); // Restore original volume
        }
    }


    // =============================================
    // --- NEW: Floating UI Update Method ---
    // =============================================
    updateFloatingUI() {
        if (this.currentTargetEnemy && this.currentTargetEnemy.active) {
            // Calculate position above the enemy's physics body top
            const targetX = this.currentTargetEnemy.x;
            const targetY = this.currentTargetEnemy.body.top; // Use physics body top

            // Position question text above the enemy
            this.questionText.setPosition(targetX, targetY - 35); // Adjust Y offset as needed
            // Position input text below question text
            this.inputText.setPosition(targetX, targetY - 5);   // Adjust Y offset as needed

            // Ensure they are visible if there's an active target
            if (!this.questionText.visible) this.questionText.setVisible(true);
            if (!this.inputText.visible) this.inputText.setVisible(true);

        } else if (this.currentTargetEnemy && !this.currentTargetEnemy.active) {
            // Target became inactive (destroyed by something else?)
            console.log("Current target became inactive, finding new target.");
            this.currentTargetEnemy = null;
            this.questionText.setVisible(false);
            this.inputText.setVisible(false);
            this.generateQuestion(); // Immediately try to find a new target

        } else {
            // No current target
            if (this.questionText.visible) this.questionText.setVisible(false);
            if (this.inputText.visible) this.inputText.setVisible(false);

            // If no target, try to generate one if enemies are present
            if (this.enemies.countActive(true) > 0) {
                 // Add a small delay before trying to generate again to avoid spamming
                 if (!this.findTargetTimer || !this.findTargetTimer.getProgress() < 1) {
                      this.findTargetTimer = this.time.delayedCall(500, this.generateQuestion, [], this);
                 }
            }
        }
    }

    // =============================================
    // --- Chapter System Methods ---
    // =============================================

    startChapter(chapterIdx) {
        if (chapterIdx >= this.chapters.length) {
            console.log("All chapters completed!");
            this.triggerVictory(); // Or some other end game sequence
            return;
        }
        this.isChapterTransitioning = false;
        this.currentChapterIndex = chapterIdx;
        const chapterConfig = this.chapters[this.currentChapterIndex];
        console.log(`Starting Chapter ${chapterConfig.chapterNumber}`);

        this.enemiesDefeatedThisChapter = 0;
        this.allowedEnemyTypes = chapterConfig.allowedEnemyTypes; // Ensure allowed types are set for the chapter
        this.allowEasyMultiplication = chapterConfig.allowEasyMultiplication;

        // Update background
        if (this.backgroundSprite) {
            this.backgroundSprite.setTexture(chapterConfig.backgroundKey);
        } else {
            this.backgroundSprite = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, chapterConfig.backgroundKey).setOrigin(0.5);
            this.backgroundSprite.setDepth(-1); // Ensure background is behind everything
        }
        
        // Update music
        if (this.currentMusic && typeof this.currentMusic.stop === 'function') {
            this.currentMusic.stop();
        }
        this.currentMusic = this.sound.play(chapterConfig.musicKey, { loop: true, volume: 0.4 });

        // Clear existing enemies from previous chapter (if any)
        this.enemies.clear(true, true);
        this.currentTargetEnemy = null;
        this.questionText.setVisible(false);
        this.inputText.setVisible(false);

        // Reset wave number for chapter-based wave progression
        this.waveNumber = 0; 
        this.enemiesSpawnedThisWave = 0;

        // Resume game systems if they were paused for transition
        if (this.physics.world.isPaused) this.physics.world.resume();
        this.wizard.anims.resume();


        // Start enemy spawning for the new chapter
        // Ensure any old timers are cleared before starting new ones
        if (this.waveSpawnTimer) this.waveSpawnTimer.remove(false);
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.remove(false);
        
        if (this.difficulty === 0) { // Practice Mode
            this.checkAndSpawnForPracticeMode();
        } else { // Normal or Hard Mode
            const initialSpawnDelay = this.difficulty === 2 ? 500 : 1500; // Hard mode starts faster for new chapter
            this.waveSpawnTimer = this.time.delayedCall(initialSpawnDelay, this.scheduleNextEnemySpawn, [], this);
            console.log(`Initial enemy spawn for new chapter (Normal/Hard) scheduled in ${initialSpawnDelay / 1000}s`);
        }

        // Ensure UI is ready for new questions
        this.generateQuestion(); // Attempt to generate a question if enemies spawn quickly
    }

    completeChapter() {
        console.log(`Chapter ${this.chapters[this.currentChapterIndex].chapterNumber} Complete!`);
        this.isChapterTransitioning = true;

        // Pause game elements
        this.physics.world.pause();
        if (this.waveSpawnTimer) this.waveSpawnTimer.paused = true;
        if (this.practiceModeSpawnCheckTimer) this.practiceModeSpawnCheckTimer.paused = true;
        this.enemies.getChildren().forEach(enemy => enemy.pause());
        this.wizard.anims.pause();
        this.questionText.setVisible(false);
        this.inputText.setVisible(false);

        // Stop current music before lore/chapter complete screen
        const chapterMusicKey = this.chapters[this.currentChapterIndex].musicKey;
        if (chapterMusicKey && this.sound.get(chapterMusicKey)?.isPlaying) {
            this.sound.stopByKey(chapterMusicKey);
            console.log(`Music for chapter ${this.currentChapterIndex + 1} (${chapterMusicKey}) stopped via stopByKey.`);
        } else if (this.currentMusic && typeof this.currentMusic.stop === 'function') {
            // Fallback or if musicKey was not found but currentMusic instance exists
            this.currentMusic.stop();
            console.log(`Music for chapter ${this.currentChapterIndex + 1} stopped via this.currentMusic.stop().`);
        }
        
        // Ensure the reference is cleared regardless, as it's no longer the "current" music.
        this.currentMusic = null;
        // Optional: Play a chapter complete jingle
        // this.sound.play('chapterCompleteSound');


        // Show "Chapter Complete" screen
        this.chapterCompleteContainer.setVisible(true);
        const chapterText = this.chapterCompleteContainer.getData('chapterText');
        chapterText.setText(`Chapter ${this.chapters[this.currentChapterIndex].chapterNumber} Complete!`);
        
        // Animate it
        this.chapterCompleteContainer.setScale(0.8).setAlpha(0.5);
        this.tweens.add({
            targets: this.chapterCompleteContainer,
            scale: 1.0,
            alpha: 1.0,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    proceedToLore() {
        this.chapterCompleteContainer.setVisible(false);
        this.showLoreScreen();
    }

    showLoreScreen() {
        const chapterConfig = this.chapters[this.currentChapterIndex];
        if (!chapterConfig.loreText) { // Should not happen if all chapters have lore
            this.proceedToNextChapter();
            return;
        }

        this.loreScreenContainer.setVisible(true);
        const loreTextDisplay = this.loreScreenContainer.getData('loreTextDisplay');
        loreTextDisplay.setText(chapterConfig.loreText);

        // Animate it
        this.loreScreenContainer.setScale(0.8).setAlpha(0.5);
        this.tweens.add({
            targets: this.loreScreenContainer,
            scale: 1.0,
            alpha: 1.0,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    proceedToNextChapter() {
        this.loreScreenContainer.setVisible(false);
        this.currentChapterIndex++;
        if (this.currentChapterIndex < this.chapters.length) {
            this.startChapter(this.currentChapterIndex);
        } else {
            this.triggerVictory(); // All chapters done
        }
    }
    
    createChapterCompleteScreen() {
        this.chapterCompleteContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2)
            .setDepth(25).setVisible(false);

        const bg = this.add.graphics()
            .fillStyle(0x003366, 0.85) // Dark blue
            .fillRoundedRect(-200, -100, 400, 200, 15)
            .lineStyle(3, 0xeeeeff, 1)
            .strokeRoundedRect(-200, -100, 400, 200, 15);

        const chapterText = this.add.text(0, -50, '', {
            fontSize: '32px', fill: '#FFD700', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);

        const continueButton = this.add.text(0, 50, 'Continue', {
            fontSize: '28px', fill: '#fff', backgroundColor: '#0066CC', padding: { x: 20, y: 10 }, fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        continueButton.on('pointerdown', () => this.proceedToLore());
        continueButton.on('pointerover', () => continueButton.setStyle({ fill: '#add8e6' }));
        continueButton.on('pointerout', () => continueButton.setStyle({ fill: '#fff' }));

        this.chapterCompleteContainer.add([bg, chapterText, continueButton]);
        this.chapterCompleteContainer.setData('chapterText', chapterText);
    }

    createLoreScreen() {
        this.loreScreenContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2)
            .setDepth(25).setVisible(false);

        // background_scroll.png is the visual, ensure it's sized appropriately
        // For simplicity, let's assume the scroll image itself is large enough to contain the text area.
        // We'll place a semi-transparent text box on top of it if needed, or just text.
        const scrollBg = this.add.image(0, 0, 'background_scroll').setScale(1); // Adjust scale as needed

        // Text box dimensions relative to the scroll image center
        const textBgWidth = scrollBg.width * 0.6; // Example: 60% of scroll width
        const textBgHeight = scrollBg.height * 0.4; // Example: 40% of scroll height
        
        // Adding a subtle background for text if scroll itself is too busy
        // const textBg = this.add.graphics()
        //     .fillStyle(0x000000, 0.3) // Very subtle dark background for text
        //     .fillRect(-textBgWidth / 2, -textBgHeight / 2, textBgWidth, textBgHeight);


        const loreTextDisplay = this.add.text(0, -20, '', { // Y offset slightly up from center
            fontSize: '20px', fill: '#3a2d20', // Dark brown text, good for scrolls
            fontStyle: 'italic',
            align: 'center',
            wordWrap: { width: textBgWidth - 20, useAdvancedWrap: true }, // Wrap text
            lineSpacing: 6
        }).setOrigin(0.5);

        const nextChapterButton = this.add.text(0, scrollBg.height * 0.5 - 40, 'Next Chapter', { // Position button towards bottom of scroll
            fontSize: '24px', fill: '#5D4037', backgroundColor: '#A1887F', padding: { x: 15, y: 8 }, fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        nextChapterButton.on('pointerdown', () => this.proceedToNextChapter());
        nextChapterButton.on('pointerover', () => nextChapterButton.setStyle({ fill: '#3E2723', backgroundColor: '#BCAAA4' }));
        nextChapterButton.on('pointerout', () => nextChapterButton.setStyle({ fill: '#5D4037', backgroundColor: '#A1887F' }));
        
        this.loreScreenContainer.add([scrollBg, /*textBg,*/ loreTextDisplay, nextChapterButton]);
        this.loreScreenContainer.setData('loreTextDisplay', loreTextDisplay);
    }

    triggerVictory() {
        // Simplified victory screen
        console.log("Player has won the game!");
        this.isGameOver = true; // Use gameOver flag to stop updates
        this.isChapterTransitioning = true; // Prevent other actions

        if (this.currentMusic && typeof this.currentMusic.stop === 'function') this.currentMusic.stop();
        // Play victory music?
        // this.sound.play('victoryMusic');

        this.physics.pause();
        this.enemies.clear(true, true);
        this.wizard.anims.stop();
        this.questionText.setVisible(false);
        this.inputText.setVisible(false);

        const victoryText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50, 'Congratulations!\nYou have cleared all chapters!', {
            fontSize: '36px', fill: '#FFD700', align: 'center', fontStyle: 'bold', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(30);

        const menuButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 50, 'Back to Menu', {
            fontSize: '28px', fill: '#fff', backgroundColor: '#007BFF', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(30).setInteractive({ useHandCursor: true });

        menuButton.on('pointerdown', () => {
            this.sound.stopAll();
            this.scene.start('StartScene');
        });
    }


} // End Class
