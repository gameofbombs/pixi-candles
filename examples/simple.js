const app = new PIXI.Application({antialias: false, autoResize: true, resolution: 0.25});
app.view.style['image-rendering'] = 'pixelated';
document.body.appendChild(app.view);

const bars = new PIXI.candles.Bars();
app.stage.addChild(bars);

for (let i=0;i<30;i++) {
    const x = i * 20.3;
    const y = i * 20.3;
    const color = i%2==0 ? 0xff0000 : 0x00ff00;
    bars.addRect(x, y, 10, 20, color);
    bars.addRect(x+4, y-10, 2, 40, color);
}
