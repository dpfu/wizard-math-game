export default class LevelSelectScene extends Phaser.Scene {
    constructor() {
        super('LevelSelectScene');
        this.selectedTables = new Set([3]); // Default to 3 times table selected
        this.selectedOperators = new Set(['⋅']); // Default to multiplication
        this.difficulty = 1; // Standardwert, wird von DifficultySelectScene überschrieben
        this.tableButtons = {}; // To store references to table button text objects
        this.operatorButtons = {}; // To store references to operator button text objects
        this.operatorOrder = ['+', '-', '⋅', ':']; // Define order for UI
    }

    init(data) {
        console.log('LevelSelectScene init, received data:', data);
        this.difficulty = data.difficulty !== undefined ? data.difficulty : 1; // Übernehme die Schwierigkeit oder Standardwert
        console.log('LevelSelectScene difficulty set to:', this.difficulty);
        // Reset selections when re-initializing the scene, if desired, or persist them.
        // For now, we keep the defaults set in constructor or previous interactions.
    }

    preload() {
        // Preload assets if needed, for now reuse existing ones
        console.log('LevelSelectScene: preload');
        // Load the specific background for this scene
        this.load.image('settingsBackground', 'assets/backgrounds/background_settings.png');
    }

    create() {
        console.log('LevelSelectScene: create');

        // --- Background ---
        // Use the specific background loaded in preload
        this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'settingsBackground')
            .setOrigin(0.5);

        // --- Title ---
        this.add.text(this.cameras.main.width / 2, 80, 'Select Times Tables', {
            fontSize: '48px', fill: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
        }).setOrigin(0.5);

        // --- Music --- (Optional: Reuse start music or add specific)
        if (!this.sound.get('startMusic')?.isPlaying) {
            this.sound.play('startMusic', { loop: true, volume: 0.5 });
        }

        // --- Operator Selection Buttons ---
        const operatorTitle = this.add.text(this.cameras.main.width / 2, 150, 'Select Operators', {
            fontSize: '32px', fill: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        const opButtonStyle = {
            fontSize: '32px', fill: '#ffffff', fontStyle: 'bold',
            backgroundColor: '#5a5a5a', // Slightly different grey for operators
            padding: { x: 20, y: 10 }, // Make them a bit wider
            stroke: '#000000', strokeThickness: 2
        };
        const opSelectedStyle = { ...opButtonStyle, backgroundColor: '#006400' }; // Darker green for selected operators
        const opHoverStyle = { fill: '#FFD700' };

        const opButtonWidth = 70; // Approximate
        const opTotalWidth = this.operatorOrder.length * opButtonWidth + (this.operatorOrder.length - 1) * 15;
        const opStartX = (this.cameras.main.width - opTotalWidth) / 2 + opButtonWidth / 2;
        const opStartY = 210; // Below operator title

        this.operatorOrder.forEach((op, index) => {
            const x = opStartX + index * (opButtonWidth + 15);
            const button = this.add.text(x, opStartY, op, opButtonStyle)
                .setOrigin(0.5)
                .setInteractive();
            this.operatorButtons[op] = button;

            if (this.selectedOperators.has(op)) {
                button.setStyle(opSelectedStyle);
            }

            button.on('pointerdown', () => {
                if (this.selectedOperators.has(op)) {
                    // Prevent deselecting the last operator
                    if (this.selectedOperators.size > 1) {
                        this.selectedOperators.delete(op);
                        button.setStyle(opButtonStyle);
                    }
                } else {
                    this.selectedOperators.add(op);
                    button.setStyle(opSelectedStyle);
                }
                this.updateTableButtonsState();
                this.updateStartButtonState();
                console.log('Selected operators:', Array.from(this.selectedOperators));
            });

            button.on('pointerover', () => button.setStyle({ ...button.style.toJSON(), ...opHoverStyle }));
            button.on('pointerout', () => {
                if (this.selectedOperators.has(op)) {
                    button.setStyle(opSelectedStyle);
                } else {
                    button.setStyle(opButtonStyle);
                }
            });
        });


        // --- Times Table Selection Buttons ---
        const tableSectionTitle = this.add.text(this.cameras.main.width / 2, 280, 'Select Times Tables (for ⋅ and :)', {
            fontSize: '24px', fill: '#ffffff', fontStyle: 'italic',
        }).setOrigin(0.5);

        const buttonStyle = {
            fontSize: '32px', fill: '#ffffff', fontStyle: 'bold',
            backgroundColor: '#4a4a4a', // Dark grey background
            padding: { x: 15, y: 10 },
            stroke: '#000000', strokeThickness: 2,
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
        };
        const selectedStyle = { ...buttonStyle, backgroundColor: '#008000' }; // Green background when selected
        const hoverStyle = { fill: '#FFD700' }; // Gold text on hover

        const columns = 5;
        const rows = 2;
        const buttonWidth = 100;
        const buttonHeight = 60; // Approximate based on style padding
        const startX = (this.cameras.main.width - (columns * buttonWidth + (columns - 1) * 20)) / 2 + buttonWidth / 2;
        const startY = 340; // Adjusted Y position
        const spacingX = buttonWidth + 20;
        const spacingY = buttonHeight + 20;

        // Tables
        for (let i = 1; i <= 10; i++) {
            const col = (i - 1) % columns;
            const row = Math.floor((i - 1) / columns);
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const buttonText = this.add.text(x, y, `${i}s`, buttonStyle)
                .setOrigin(0.5)
                .setInteractive();

            this.tableButtons[i] = buttonText; // Store reference

            if (this.selectedTables.has(i)) {
                buttonText.setStyle(selectedStyle);
            }

            buttonText.on('pointerdown', () => {
                if (!buttonText.input.enabled) return; // Do nothing if disabled

                if (this.selectedTables.has(i)) {
                    this.selectedTables.delete(i);
                    buttonText.setStyle(buttonStyle);
                } else {
                    this.selectedTables.add(i);
                    buttonText.setStyle(selectedStyle);
                }
                this.updateStartButtonState();
                console.log('Selected tables:', Array.from(this.selectedTables));
            });

            buttonText.on('pointerover', () => {
                if (buttonText.input.enabled) {
                    buttonText.setStyle({ ...buttonText.style.toJSON(), ...hoverStyle });
                }
            });
            buttonText.on('pointerout', () => {
                if (buttonText.input.enabled) {
                    if (this.selectedTables.has(i)) {
                        buttonText.setStyle(selectedStyle);
                    } else {
                        buttonText.setStyle(buttonStyle);
                    }
                }
            });
        }

        // --- Start Game Button ---
        this.startButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 100, 'Start Game', {
            fontSize: '40px', fill: '#ffffff', fontStyle: 'bold',
            backgroundColor: '#8B4513', // Brown background
            padding: { x: 25, y: 15 },
            stroke: '#000000', strokeThickness: 2,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
        }).setOrigin(0.5).setInteractive();

        // Hover effect for Start Button
        this.startButton.on('pointerover', () => {
            if (this.startButton.alpha === 1) { // Only change if enabled
                 this.startButton.setStyle({ fill: '#FFD700' }); // Gold on hover
            }
        });
        this.startButton.on('pointerout', () => {
             this.startButton.setStyle({ fill: '#ffffff' }); // Back to white
        });

        // Click action for Start Button
        this.startButton.on('pointerdown', () => {
            if (this.selectedTables.size > 0) {
                console.log('Starting GameScene with tables:', Array.from(this.selectedTables), 'and operators:', Array.from(this.selectedOperators));
                this.cameras.main.fadeOut(500, 0, 0, 0, (camera, progress) => {
                    if (progress === 1) {
                        this.sound.stopAll(); // Stop menu music
                        this.scene.start('GameScene', {
                            difficulty: this.difficulty,
                            selectedTables: Array.from(this.selectedTables),
                            selectedOperators: Array.from(this.selectedOperators)
                        });
                    }
                });
            } else {
                console.log('Selection criteria not met for starting game.');
            }
        });

        // --- Info Text ---
        this.infoText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, 'Select operator(s) and table(s) if needed.', {
            fontSize: '20px', fill: '#ffdddd', fontStyle: 'italic'
        }).setOrigin(0.5).setVisible(false); // Initially hidden

        // Initial state update for all buttons
        this.updateTableButtonsState(); // This will also call updateStartButtonState
    }

    updateTableButtonsState() {
        const multiplicationOrDivisionSelected = this.selectedOperators.has('⋅') || this.selectedOperators.has(':');
        const tableButtonActiveStyle = { fontSize: '32px', fill: '#ffffff', fontStyle: 'bold', backgroundColor: '#4a4a4a', padding: { x: 15, y: 10 }, stroke: '#000000', strokeThickness: 2 };
        const tableButtonSelectedStyle = { ...tableButtonActiveStyle, backgroundColor: '#008000' };
        const tableButtonDisabledStyle = { ...tableButtonActiveStyle, fill: '#888888', backgroundColor: '#333333' };


        for (let i = 1; i <= 10; i++) {
            const button = this.tableButtons[i];
            if (multiplicationOrDivisionSelected) {
                button.setInteractive();
                button.setAlpha(1);
                // Restore correct style if it was disabled
                if (this.selectedTables.has(i)) {
                    button.setStyle(tableButtonSelectedStyle);
                } else {
                    button.setStyle(tableButtonActiveStyle);
                }
                button.input.enabled = true;
            } else {
                button.disableInteractive(); // More robust way to disable
                button.setAlpha(0.5);
                button.setStyle(tableButtonDisabledStyle); // Visually indicate disabled
                button.input.enabled = false;
            }
        }

        if (!multiplicationOrDivisionSelected) {
            this.selectedTables.clear(); // Clear selected tables if no relevant operator is chosen
            // Ensure buttons visually reflect the cleared selection
            for (let i = 1; i <= 10; i++) {
                 this.tableButtons[i].setStyle(tableButtonDisabledStyle);
            }
        }
        this.updateStartButtonState();
    }

    updateStartButtonState() {
        let tablesRequired = this.selectedOperators.has('⋅') || this.selectedOperators.has(':');
        let canStart = false;

        if (this.selectedOperators.size > 0) {
            if (tablesRequired) {
                if (this.selectedTables.size > 0) {
                    canStart = true;
                }
            } else { // Only + or - selected
                canStart = true;
            }
        }

        if (canStart) {
            this.startButton.setAlpha(1);
            this.startButton.setInteractive();
            this.infoText.setVisible(false);
        } else {
            this.startButton.setAlpha(0.5);
            this.startButton.disableInteractive(); // Make it truly non-interactive
            this.infoText.setText('Select operator(s). If ⋅ or :, select table(s).');
            this.infoText.setVisible(true);
        }
    }
}
