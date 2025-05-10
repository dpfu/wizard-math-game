import Enemy from './Enemy.js';

export default class Shadow extends Enemy {
    constructor(scene, x, y, difficulty) { // difficulty Parameter wird beibehalten, falls für HP etc. benötigt
        const config = {
            hitPoints: 1,
            moveSpeed: 40, // Basisgeschwindigkeit, wird in GameScene basierend auf globaler difficulty angepasst
            isLoner: true, // Does not spawn in groups easily
            animationKey: 'shadow_idle',
            scale: 2.0
        };
        // Use frame 0 from 'enemies' spritesheet as default frame
        super(scene, x, y, 'enemies', 0, config);
    }

    // Override methods if Shadow has unique behavior
}
