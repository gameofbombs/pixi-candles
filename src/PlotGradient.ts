namespace pixi_candles {
    const gradVert = `
attribute vec2 aVertexPosition;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec2 rangeY;

varying float vOrdinate;

void main(void)
{
    vec2 pos = (translationMatrix * vec3(aVertexPosition, 1.0)).xy;
    if (pos.y > rangeY.y) {
        pos.y = rangeY.y;
    }
    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
    vOrdinate = pos.y;
}`;
    const gradFrag = `
varying float vOrdinate;

uniform vec4 colorTop;
uniform vec4 colorBottom;
uniform vec4 uColor;
uniform vec2 rangeY2;

void main(void)
{
    vec4 color = colorTop;
    if (vOrdinate > rangeY2.x) {
        if (vOrdinate >= rangeY2.y) {
            color = colorBottom;
        } else {
            color = colorTop + (colorBottom - colorTop) * (vOrdinate - rangeY2.x) / (rangeY2.y - rangeY2.x);
        }
    }

    color.rgb *= color.a;
    gl_FragColor = color * uColor;
}
`;

    export class PlotGradientShader extends PIXI.MeshMaterial {
        static _prog: PIXI.Program = null;

        static getProgram(): PIXI.Program {
            if (!PlotGradientShader._prog) {
                PlotGradientShader._prog = new PIXI.Program(gradVert, gradFrag);
            }
            return PlotGradientShader._prog;
        }

        constructor() {
            const rangeY = new Float32Array(2);
            super(PIXI.Texture.WHITE, {
                uniforms: {
                    resolution: 1,
                    colorTop: new Float32Array([1, 1, 1, 1]),
                    colorBottom: new Float32Array([1, 1, 1, 1]),
                    rangeY: rangeY,
                    rangeY2: rangeY,
                },
                program: PlotGradientShader.getProgram()
            });
        }
    }

    import TYPES = PIXI.TYPES;

    export class PlotGradientGeometry extends PIXI.Geometry {
        constructor(_static = false) {
            super();
            this.initGeom(_static);
            this.reset();
        }

        lastLen = 0;
        lastPointNum = 0;
        lastPointData = 0;
        points: Array<number> = [];
        _floatView: Float32Array = null;
        _buffer: PIXI.Buffer = null;

        initGeom(_static: boolean) {
            this._buffer = new PIXI.Buffer(null, _static, false);

            this.addAttribute('aVertexPosition', this._buffer, 2, false, TYPES.FLOAT);
        }

        stridePoints = 2;
        strideFloats = 2 * 6;
        strideBytes = 8 * 6;

        invalidate(pointNum = 0) {
            this.lastPointNum = Math.min(pointNum, this.lastPointNum);
        }

        reset() {
            if (this.lastLen > 0) {
                this.clearBufferData();
            }
            this.lastLen = 0;
            this.lastPointData = 0;
            this.points.length = 0;
        }

        clearBufferData() {
            const {points, strideFloats, stridePoints} = this;
            this.lastPointNum = 0;
            this.lastPointData = 0;
            const arrayLen = Math.max(0, points.length / stridePoints - 1);
            this._floatView = new Float32Array(strideFloats * arrayLen);
            this._buffer.update(this._floatView);
            this.lastLen = points.length;
        }

        updateBuffer() {
            const {points, stridePoints, strideFloats} = this;

            if (this.lastLen > points.length) {
                this.lastLen = 0;
            }
            if (this.lastLen < points.length
                || this.lastPointNum < this.lastLen) { // TODO: partial upload
                this.clearBufferData();
            }

            if (this.lastPointNum == this.lastLen) {
                return;
            }

            const {_floatView} = this;
            this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
            let j = Math.round(this.lastPointNum * strideFloats / stridePoints);
            for (let i = this.lastPointNum; i < points.length - stridePoints; i += stridePoints) {
                const next = i + stridePoints;

                const x = points[i], y = points[i + 1], x2 = points[next], y2 = points[next + 1];

                const bottomLine = 10000.0;

                _floatView[j++] = x;
                _floatView[j++] = y;
                _floatView[j++] = x2;
                _floatView[j++] = y2;
                _floatView[j++] = x2;
                _floatView[j++] = bottomLine;
                _floatView[j++] = x;
                _floatView[j++] = y;
                _floatView[j++] = x2;
                _floatView[j++] = bottomLine;
                _floatView[j++] = x;
                _floatView[j++] = bottomLine;
            }
            this._buffer.update();

            this.lastPointNum = this.lastLen;
            this.lastPointData = this.lastLen; // TODO: partial upload
        }
    }

    export class PlotGradient extends PIXI.Mesh {
        constructor() {
            super(new PlotGradientGeometry(), new PlotGradientShader());
        }

        get coordTop(): number {
            return this.shader.uniforms.rangeY[0];
        }

        set coordTop(value: number) {
            this.shader.uniforms.rangeY[0] = value;
        }

        get coordBottom(): number {
            return this.shader.uniforms.rangeY[1];
        }

        set coordBottom(value: number) {
            this.shader.uniforms.rangeY[1] = value;
        }

        get alphaTop(): number {
            return this.shader.uniforms.colorTop[3];
        }

        set alphaTop(value: number) {
            this.shader.uniforms.colorTop[3] = value;
        }

        get alphaBottom(): number {
            return this.shader.uniforms.colorBottom[3];
        }

        set alphaBottom(value: number) {
            this.shader.uniforms.colorBottom[3] = value;
        }

        get colorBottom(): number {
            return PIXI.utils.rgb2hex(this.shader.uniforms.colorBottom);
        }

        set colorBottom(value: number) {
            PIXI.utils.hex2rgb(value, this.shader.uniforms.colorBottom);
        }

        get colorTop(): number {
            return PIXI.utils.rgb2hex(this.shader.uniforms.colorTop);
        }

        set colorTop(value: number) {
            PIXI.utils.hex2rgb(value, this.shader.uniforms.colorTop);
        }

        masterPlot: Plot = null;
        plotUpdateId = -1;

        _render(renderer: PIXI.Renderer): void {
            const geom = this.geometry as PlotGradientGeometry;
            if (this.masterPlot) {
                const plotGeom = this.masterPlot.geometry as PlotGeometry;
                if (this.plotUpdateId !== plotGeom.updateId) {
                    this.plotUpdateId = plotGeom.updateId
                    geom.points = plotGeom.points;
                }
            }
            geom.updateBuffer();

            this._renderDefault(renderer);
        }

        _renderCanvas(renderer: PIXI.CanvasRenderer): void {
            const geom = this.geometry as PlotGradientGeometry;
            // let points = geom.points;
            // if (this.masterPlot) {
            //     const plotGeom = this.masterPlot.geometry as PlotGeometry;
            //     if (this.plotUpdateId !== plotGeom.updateId) {
            //         this.plotUpdateId = plotGeom.updateId
            //         geom.points = plotGeom.points;
            //     }
            // }
            //
            //
            // const {points, stridePoints} = this.geometry as BarsGeometry;
            // const {context} = renderer;
            // const len = points.length;
            // if (len < 2) {
            //     return;
            // }
            // const wt = this.transform.worldTransform;
            // renderer.setContextTransform(wt);
            //
            // const scale = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
            // context.lineWidth = this.shader.uniforms.lineWidth[0] + this.shader.uniforms.lineWidth[1] / scale;
            //
            // context.strokeStyle = PIXI.utils.hex2string(this.tint);
            // context.globalAlpha = this.worldAlpha;
            //
            // context.beginPath();
            // context.moveTo(points[0], points[1]);
            // for (let i = 2; i < points.length; i += stridePoints) {
            //     context.lineTo(points[i], points[i + 1]);
            // }
            // context.stroke();
            // context.beginPath();
            //
            // context.globalAlpha = 1.0;
        }
    }
}
