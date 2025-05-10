export default class DifficultySelectScene extends Phaser.Scene {
    constructor() {
        super('DifficultySelectScene');
    }

    preload() {
        // Wiederverwenden des Hintergrunds oder Laden eines spezifischen
        this.load.image('settingsBackground', 'assets/backgrounds/background_settings.png');
        // Optional: Musik wiederverwenden oder laden
        if (!this.sound.get('startMusic')) {
            this.load.audio('startMusic', 'assets/music/Start.mp3');
        }
    }

    create() {
        console.log('DifficultySelectScene: create');

        // --- Hintergrund ---
        this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'settingsBackground')
            .setOrigin(0.5);

        // --- Musik ---
        if (!this.sound.get('startMusic')?.isPlaying) {
            this.sound.play('startMusic', { loop: true, volume: 0.5 });
        }

        // --- Titel ---
        this.add.text(this.cameras.main.width / 2, 80, 'Select Difficulty', {
            fontSize: '48px', fill: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true }
        }).setOrigin(0.5);

        // --- Schaltflächen-Stile ---
        const buttonStyle = {
            fontSize: '32px', fill: '#ffffff', fontStyle: 'bold',
            backgroundColor: '#4a4a4a',
            padding: { x: 20, y: 15 },
            stroke: '#000000', strokeThickness: 2,
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true },
            fixedWidth: 350,
            align: 'center'
        };
        const hoverStyle = { fill: '#FFD700' };

        const difficulties = [
            { text: 'Practice\n(Baby Mode)', description: '1 slow enemy at a time.', difficultyValue: 0, color: '#28a745' }, // Grün
            { text: 'Normal', description: 'Up to 3 enemies, moderate speed.', difficultyValue: 1, color: '#007bff' }, // Blau
            { text: 'Hard', description: 'Unlimited fast enemies.', difficultyValue: 2, color: '#dc3545' }  // Rot
        ];

        const startY = 180;
        const spacingY = 110;

        difficulties.forEach((level, index) => {
            const y = startY + index * spacingY;

            const button = this.add.text(this.cameras.main.width / 2, y, level.text, { ...buttonStyle, backgroundColor: level.color })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            const descText = this.add.text(this.cameras.main.width / 2, y + 45, level.description, {
                fontSize: '18px', fill: '#dddddd', fontStyle: 'italic', align: 'center'
            }).setOrigin(0.5);

            button.on('pointerdown', () => {
                console.log(`Difficulty selected: ${level.text}, value: ${level.difficultyValue}`);
                this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
                    if (progress === 1) {
                        // Musik für LevelSelectScene weiterspielen lassen
                        this.scene.start('LevelSelectScene', { difficulty: level.difficultyValue });
                    }
                });
            });

            button.on('pointerover', () => button.setStyle(hoverStyle));
            button.on('pointerout', () => button.setStyle({ fill: '#ffffff' }));
        });

        // --- Zurück-Button (optional, falls man von hier zur StartScene zurück möchte) ---
        const backButton = this.add.text(50, this.cameras.main.height - 40, 'Back', {
            fontSize: '24px', fill: '#FFF', backgroundColor: '#555', padding: { x: 10, y: 5 }
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
                if (progress === 1) {
                    this.scene.start('StartScene');
                }
            });
        });
        backButton.on('pointerover', () => backButton.setStyle({ fill: '#FFD700' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#FFF' }));
    }
}
