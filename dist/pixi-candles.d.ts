declare namespace PIXI.candles {
    class BarsShader extends PIXI.MeshMaterial {
        static _prog: PIXI.Program;
        static getProgram(): PIXI.Program;
        constructor();
    }
    class BarsGeometry extends PIXI.Geometry {
        constructor(_static?: boolean);
        lastLen: number;
        lastPointNum: number;
        lastPointData: number;
        points: Array<number>;
        _floatView: Float32Array;
        _u32View: Uint32Array;
        _buffer: PIXI.Buffer;
        _quad: PIXI.Buffer;
        _indexBuffer: PIXI.Buffer;
        initGeom(_static: boolean): void;
        stridePoints: number;
        strideFloats: number;
        strideBytes: number;
        addRect(x: number, y: number, w: number, h: number, color: number): void;
        invalidate(pointNum?: number): void;
        reset(): void;
        clearBufferData(): void;
        updateBuffer(): void;
        legacyGeom: PIXI.Geometry;
        legacyBuffer: PIXI.Buffer;
        initLegacy(): void;
        updateLegacy(): void;
    }
    class Bars extends PIXI.Mesh {
        constructor();
        addRect(x: number, y: number, w: number, h: number, color: number): void;
        clear(): void;
        _renderDefault(renderer: PIXI.Renderer): void;
        _renderCanvas(renderer: PIXI.CanvasRenderer): void;
    }
}
declare namespace PIXI.candles {
    class LineMesh extends PIXI.Mesh {
        shaderApplied: boolean;
        needApplyAlpha: boolean;
        constructor(g: PIXI.Geometry);
        buildShader(r: PIXI.Renderer): void;
        resetDepth(r: PIXI.Renderer): void;
        render(renderer: PIXI.Renderer): void;
        _renderDefault(renderer: PIXI.Renderer): void;
    }
    class ExtraGraphicsGeometry extends PIXI.GraphicsGeometry {
        _isolatedLines: PIXI.GraphicsData[];
        _meshGeom: PIXI.Geometry;
        needApplyAlpha: boolean;
        updateBatches(indeces32: boolean): void;
        populateMeshGeometry(): void;
    }
    class ExtraLineGraphics extends PIXI.Graphics {
        _subMesh: LineMesh;
        constructor();
        _render(r: PIXI.Renderer): void;
    }
}
declare namespace PIXI.candles {
    class PlotShader extends PIXI.MeshMaterial {
        static _prog: PIXI.Program;
        static getProgram(): PIXI.Program;
        constructor();
    }
    class PlotGeometry extends PIXI.Geometry {
        constructor(_static?: boolean);
        jointStyle: PIXI.LINE_JOIN;
        lastLen: number;
        lastPointNum: number;
        lastPointData: number;
        updateId: number;
        points: Array<number>;
        _floatView: Float32Array;
        _u32View: Uint32Array;
        _buffer: PIXI.Buffer;
        _quad: PIXI.Buffer;
        _indexBuffer: PIXI.Buffer;
        initGeom(_static: boolean): void;
        stridePoints: number;
        strideFloats: number;
        strideBytes: number;
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        lineBy(dx: number, dy: number): void;
        invalidate(pointNum?: number): void;
        reset(): void;
        clearBufferData(): void;
        updateBuffer(): void;
        legacyGeom: PIXI.Geometry;
        legacyBuffer: PIXI.Buffer;
        initLegacy(): void;
        updateLegacy(): void;
    }
    interface PlotOptions {
        lineWidth?: number;
        nativeLineWidth?: number;
        jointStyle?: PIXI.LINE_JOIN;
    }
    class Plot extends PIXI.Mesh {
        constructor(options: PlotOptions);
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        lineBy(x: number, y: number): void;
        lineStyle(width?: number, nativeWidth?: number, jointStyle?: number): void;
        clear(): void;
        _renderDefault(renderer: PIXI.Renderer): void;
        _renderCanvas(renderer: PIXI.CanvasRenderer): void;
    }
}
declare namespace PIXI.candles {
    class PlotGradientShader extends PIXI.MeshMaterial {
        static _prog: PIXI.Program;
        static getProgram(): PIXI.Program;
        constructor();
    }
    class PlotGradientGeometry extends PIXI.Geometry {
        constructor(_static?: boolean);
        lastLen: number;
        lastPointNum: number;
        lastPointData: number;
        points: Array<number>;
        _floatView: Float32Array;
        _buffer: PIXI.Buffer;
        initGeom(_static: boolean): void;
        stridePoints: number;
        strideFloats: number;
        strideBytes: number;
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        invalidate(pointNum?: number): void;
        reset(): void;
        clearBufferData(): void;
        updateBuffer(): void;
    }
    class PlotGradient extends PIXI.Mesh {
        constructor();
        get coordTop(): number;
        set coordTop(value: number);
        get coordBottom(): number;
        set coordBottom(value: number);
        get alphaTop(): number;
        set alphaTop(value: number);
        get alphaBottom(): number;
        set alphaBottom(value: number);
        get colorBottom(): number;
        set colorBottom(value: number);
        get colorTop(): number;
        set colorTop(value: number);
        masterPlot: Plot;
        plotUpdateId: number;
        clear(): void;
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        _render(renderer: PIXI.Renderer): void;
        _renderCanvas(renderer: PIXI.CanvasRenderer): void;
    }
}
declare namespace PIXI.candles {
}
declare module "pixi-candles" {
    export = PIXI.candles;
}
