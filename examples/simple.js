const app = new PIXI.Application({antialias: false});
document.body.appendChild(app.view);

const bars = new PIXI.candles.Bars();
app.addChild(bars);

for (let i=0;i<100;i ++) {
    const x = i * 20.3;
    const y = i * 20.3;
    bars.addRect(x, y, 10, 20);
    bars.addRect(x+4, y-10, 2, 30);
}
