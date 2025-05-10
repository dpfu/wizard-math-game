import Enemy from './Enemy.js';

export default class Plant extends Enemy {
    constructor(scene, x, y, difficulty) { // difficulty Parameter wird beibehalten, falls für HP etc. benötigt
        const config = {
            hitPoints: 2, // Takes two hits
            moveSpeed: 25, // Basisgeschwindigkeit, wird in GameScene basierend auf globaler difficulty angepasst
            isLoner: true, // Does not spawn in groups easily
            animationKey: 'plant_idle',
            scale: 2.0
        };
         // Use frame 6 from 'enemies' spritesheet as default frame
        super(scene, x, y, 'enemies', 6, config);
    }

    // Override methods if Plant has unique behavior
    // Example: Maybe it stops moving sometimes?
}
