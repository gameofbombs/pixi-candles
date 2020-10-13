# pixi-candles
PixiJS v5 plugins that draws bars and lines

### Build & test

```bash
yarn
yarn build
http-server -c-1
```

Open `examples/simple.html`

### Webpack, browserify, Angular

Its a bit tricky. You have to put this thing in one of your root files that are loaded before everything else!

Make sure that you dont have two copies of pixiJS: one from html, one from browserify, it happens. 

```
import * as PIXI from "pixi.js';
window.PIXI = PIXI;
require("pixi-candles")
```
