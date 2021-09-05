const app = new PIXI.Application({ antialias: false,
    width: 800, height: 600,
    autoDensity: true, resolution: 1.0,
    backgroundColor: 0xffffff
});
document.body.appendChild(app.view);

const container1 = new PIXI.Container();
for (let i=0;i<6;i++) {
    container1.addChild(new PIXI.candles.Plot());
}
const container2 = new PIXI.Container();
for (let i=0;i<6;i++) {
    container2.addChild(new PIXI.Graphics);
}

app.stage.addChild(container1);

const graphics2 = new PIXI.Graphics();
container2.y = 300;
app.stage.addChild(container2);

let phase = 0;// -Math.PI/2;

function addLine(container, ind, y, len, rad, cap) {
    let graphics = container.children[ind+0];
    graphics.lineStyle({ width: 30, color: 0, alpha: 1, join: PIXI.LINE_JOIN.MITER, cap});
    graphics.moveTo(150 - len, y);
    graphics.lineTo(150, y);
    graphics.lineTo(150 + Math.cos(phase) * rad, y + Math.sin(phase) * rad);

    graphics = container.children[ind+1];
    graphics.lineStyle({ width: 30, color: 0, alpha: 1, join: PIXI.LINE_JOIN.BEVEL, cap});
    graphics.moveTo(350 + Math.cos(phase) * rad, y + Math.sin(phase) * rad);
    graphics.lineTo(350, y);
    graphics.lineTo(350 - len, y);

    graphics = container.children[ind+2];
    graphics.lineStyle({ width: 30, color: 0, alpha: 1, join: PIXI.LINE_JOIN.ROUND, cap});
    graphics.moveTo(550 - len, y);
    graphics.lineTo(550, y);
    graphics.lineTo(550 + Math.cos(phase) * rad, y + Math.sin(phase) * rad);
}

function makeFigures(container) {
    for (let i=0;i<6;i++) {
        container.children[i].clear();
    }

    addLine(container, 0, 100, 50, 60, PIXI.LINE_CAP.BUTT);
    addLine(container, 3, 200, 50, 60, PIXI.LINE_CAP.ROUND);
}

app.stage.alpha = 0.7;

// graphics.rotation = Math.PI * 3 / 2 - 0.0001;
app.ticker.add((delta) => {
    phase -= 0.008 * delta;
    makeFigures(container1);
    makeFigures(container2);
});
