/// <reference types="pixi.js-legacy" />

namespace pixi_candles {
    (PIXI as any).candles = pixi_candles;
}

declare module "pixi-candles" {
    export = pixi_candles;
}
