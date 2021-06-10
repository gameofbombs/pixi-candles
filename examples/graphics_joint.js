const app = new PIXI.Application({ antialias: false,
    width: 800, height: 600,
    autoDensity: true, resolution: 1.0,
    backgroundColor: 0xffffff
});
document.body.appendChild(app.view);

const graphics = new PIXI.candles.SmoothGraphics();
app.stage.addChild(graphics);

const graphics2 = new PIXI.Graphics();
PIXI.Graphics.prototype.drawStar = PIXI.candles.SmoothGraphics.prototype.drawStar;
graphics2.y = 300;
app.stage.addChild(graphics2);

let phase = 0;

function makeFigures(graphics) {
    graphics.clear();
    graphics.lineStyle({ width: 30, color: 0, alpha: 1, join: PIXI.LINE_JOIN.MITER});

    const rad = 70;

    graphics.moveTo(100, 100);
    graphics.lineTo(150, 100);
    graphics.lineTo(150 + Math.cos(phase) * rad, 100 + Math.sin(phase) * rad);

    graphics.lineStyle({ width: 30, color: 0, alpha: 1, join: PIXI.LINE_JOIN.BEVEL});

    graphics.moveTo(300, 100);
    graphics.lineTo(350, 100);
    graphics.lineTo(350 + Math.cos(phase) * rad, 100 + Math.sin(phase) * rad);

    graphics.lineStyle({ width: 30, color: 0, alpha: 1, join: PIXI.LINE_JOIN.ROUND});

    graphics.moveTo(500, 100);
    graphics.lineTo(550, 100);
    graphics.lineTo(550 + Math.cos(phase) * rad, 100 + Math.sin(phase) * rad);
}

// graphics.rotation = Math.PI * 3 / 2 - 0.0001;
app.ticker.add((delta) => {
    phase -= 0.008 * delta;
    makeFigures(graphics);
    makeFigures(graphics2);
});
