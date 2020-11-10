const app = new PIXI.Application({antialias: false, autoResize: true, resolution: 1 /*, forceCanvas: true*/});
app.view.style['image-rendering'] = 'pixelated';
document.body.appendChild(app.view);

const plot = new PIXI.candles.Plot();

// normal line
// plot.lineStyle(5);

// native scaling
plot.lineStyle(0, 10);

// view geometry!
plot.tint = 0xff0000;
PIXI.utils.hex2rgb(0xffffff, plot.shader.uniforms.uGeomColor);

const s = 30;
const t = 1 * s , u = 5 * s;

plot.position.set(50,50);
plot.moveTo(0, 0);
plot.lineBy(t, u);
plot.lineBy(u, -t);
plot.lineBy(u, t);
plot.lineBy(t, -u);
plot.lineBy(u, t);
plot.lineBy(u, -t);
plot.lineBy(t, u);
app.stage.addChild(plot);

let phase = 0.0;
app.ticker.add((delta) => {
    phase += delta * 0.03;
    plot.scale.set(Math.sin(phase) * 0.5 + 1.5);
})
