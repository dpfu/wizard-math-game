/**
 * Erstellt einen Blitz-Effekt von einem Startpunkt zu einem Endpunkt.
 * @param {Phaser.Scene} scene - Die Szene, in der der Blitz erstellt wird.
 * @param {number} startX - Die Start-X-Koordinate.
 * @param {number} startY - Die Start-Y-Koordinate.
 * @param {number} endX - Die End-X-Koordinate (z.B. Gegnerzentrum X).
 * @param {number} endY - Die End-Y-Koordinate (z.B. Gegnerzentrum Y mit Jitter).
 */
export function createLightningEffect(scene, startX, startY, endX, endY) {
    const segments = 12; // Mehr Segmente für glattere Animation/Jitter
    const jitter = 15;   // Max. Pixel-Offset für den Zickzack
    const duration = 75; // Gesamtdauer für die Blitzanimation (ms)
    const delayBetweenSegments = duration / segments;
    const glowColor = 0xffff88; // Weiches Gelb für den Schein
    const glowAlpha = 0.25;
    const glowWidth = 10;
    const mainColor = 0xFFFF00; // Helles Gelb für den Hauptblitz
    const mainAlpha = 1.0;
    const mainWidth = 3;
    const impactShakeDuration = 80;
    const impactShakeIntensity = 0.005;
    const fadeOutDuration = 100; // Wie lange der Blitz nach dem Zeichnen sichtbar bleibt

    // --- Punkte generieren ---
    const points = [];
    points.push(new Phaser.Math.Vector2(startX, startY)); // Startpunkt

    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        // Basisposition mittels linearer Interpolation
        let x = Phaser.Math.Linear(startX, endX, t);
        let y = Phaser.Math.Linear(startY, endY, t);
        // Zufälligen Jitter hinzufügen, außer für den allerersten und letzten Punkt
        if (i < segments) {
            x += Phaser.Math.Between(-jitter, jitter);
            y += Phaser.Math.Between(-jitter, jitter);
        }
        points.push(new Phaser.Math.Vector2(x, y));
    }

    // --- Grafikobjekte erstellen ---
    // Schein-Ebene (wird zuerst gezeichnet, darunter)
    const glowGraphics = scene.add.graphics().setDepth(5); // Sicherstellen, dass der Schein ggf. hinter dem Hauptblitz liegt
    glowGraphics.lineStyle(glowWidth, glowColor, glowAlpha);

    // Hauptblitz-Ebene
    const lightningGraphics = scene.add.graphics().setDepth(6); // Sicherstellen, dass der Hauptblitz oben liegt
    lightningGraphics.lineStyle(mainWidth, mainColor, mainAlpha);

    // --- Zeichnen animieren ---
    let currentSegment = 0;
    const drawSegment = () => {
        if (currentSegment >= points.length - 1) {
            // Animation beendet
            // Aufprall-Sound abspielen (castSound wiederverwenden oder einen dedizierten 'zap'-Sound hinzufügen)
            scene.sound.play('castSound', { volume: 0.6 }); // Einen einzigartigen Sound in Betracht ziehen: 'zapSound'
            // Optional: Kamera-Shake beim Aufprall
            scene.cameras.main.shake(impactShakeDuration, impactShakeIntensity);

            // Timer setzen, um die Grafiken nach kurzer Verzögerung zu zerstören
            scene.time.delayedCall(fadeOutDuration, () => {
                glowGraphics.destroy();
                lightningGraphics.destroy();
            });
            return; // Schleife stoppen
        }

        const p1 = points[currentSegment];
        const p2 = points[currentSegment + 1];

        // Segment auf beiden Grafikobjekten zeichnen
        glowGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));
        lightningGraphics.strokeLineShape(new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y));

        currentSegment++;
    };

    // Zeitgesteuertes Ereignis verwenden, um drawSegment wiederholt aufzurufen
    scene.time.addEvent({
        delay: delayBetweenSegments,
        callback: drawSegment,
        callbackScope: scene, // Wichtig: callbackScope auf scene setzen, falls drawSegment 'this' verwendet, obwohl es hier nicht der Fall ist
        repeat: segments // 'segments' Mal ausführen, um alle Linien zwischen den Punkten zu zeichnen
    });
}
