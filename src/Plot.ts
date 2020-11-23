namespace pixi_candles {
    const plotVert = `
attribute vec2 aPoint0;
attribute vec2 aPoint1;
attribute vec2 aSides;
attribute vec2 aQuad;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform float resolution;
uniform vec2 lineWidth;
uniform float miterLimit;

varying vec3 line;
varying vec3 lineLeft;
varying vec3 lineRight;
varying vec4 vPixelPos;

const float eps = 0.001;

void main(void) {
    float lenX = length(translationMatrix * vec3(1.0, 0.0, 0.0));
    float w = (lineWidth.x * lenX + lineWidth.y) * 0.5 * resolution;

    vec2 p0 = (translationMatrix * vec3(aPoint0, 1.0)).xy;
    vec2 p1 = (translationMatrix * vec3(aPoint1, 1.0)).xy;

    p0 *= resolution;
    p1 *= resolution;

    vec2 k0 = (translationMatrix * vec3(1.0, aSides[0], 0.0)).xy;
    vec2 k1 = (translationMatrix * vec3(1.0, aSides[1], 0.0)).xy;

    if (p0.x > p1.x) {
        // make everything positive
        vec2 tmp = p0;
        p0 = p1;
        p1 = tmp;
        tmp = k0;
        k0 = k1;
        k1 = tmp;
    }

    line.x = (p1.y - p0.y) / (p1.x - p0.x);
    line.y = p0.y - line.x * p0.x;
    line.z = w * sqrt(line.x * line.x + 1.0);

    lineLeft.x = k0.y / k0.x;
    lineLeft.y = p0.y - lineLeft.x * p0.x;
    lineLeft.z = w * sqrt(lineLeft.x * lineLeft.x + 1.0);

    lineRight.x = k1.y / k1.x;
    lineRight.y = p1.y - lineRight.x * p1.x;
    lineRight.z = w * sqrt(lineRight.x * lineRight.x + 1.0);

    // calculating quad
    vec2 pos = vec2(0.0);

    //always round to the left
    vec2 sign = aQuad;
    sign.x = 0.0;

    float H = 0.0;
    if (aQuad.x < 0.5) {
        H = min(miterLimit * line.z, max(lineLeft.z, line.z));
        pos = p0;
    } else {
        H = min(miterLimit * line.z, max(lineRight.z, line.z));
        pos = p1;
    }
    H += 2.0;
    pos.y += H * (aQuad.y * 2.0 - 1.0);

    pos.y -= (pos.x - floor(pos.x + eps)) * line.x;
    pos = floor(pos + eps + sign * (1.0 - 2.0 * eps));
    vPixelPos = vec4(pos - 0.5, pos + 0.5);
    gl_Position = vec4((projectionMatrix * vec3(pos / resolution, 1.0)).xy, 0.0, 1.0);
}`;
    const plotFrag = `
varying vec3 line;
varying vec3 lineLeft;
varying vec3 lineRight;
varying vec4 vPixelPos;
uniform vec4 uColor;
uniform vec4 uGeomColor;

float cut(float x, float y1, float y2) {
    vec2 range = vec2(dot(line, vec3(x, 1.0, -1.0)), dot(line, vec3(x, 1.0, 1.0)));
    if (line.x + lineLeft.x > 0.0) {
        float v = dot(lineLeft, vec3(x, 1.0, -1.0));
        if (line.x < lineLeft.x) {
            range.x = min(range.x, v);
        } else {
            range.x = max(range.x, v);
        }
    } else {
        float v = dot(lineLeft, vec3(x, 1.0, 1.0));
        if (line.x < lineLeft.x) {
            range.y = min(range.y, v);
        } else {
            range.y = max(range.y, v);
        }
    }

    if (line.x + lineRight.x < 0.0) {
        float v = dot(lineRight, vec3(x, 1.0, -1.0));
        if (line.x > lineRight.x) {
            range.x = min(range.x, v);
        } else {
            range.x = max(range.x, v);
        }
    } else {
        float v = dot(lineRight, vec3(x, 1.0, 1.0));
        if (line.x > lineRight.x) {
            range.y = min(range.y, v);
        } else {
            range.y = max(range.y, v);
        }
    }

    range.x = max(range.x, y1);
    range.y = min(range.y, y2);
    return max(range.y - range.x, 0.0);
}

const float N = 8.0;
const float step = 1.0 / N;
const float div = 1.0 / (N + 1.0);

void main(void) {
    // float cutLeft = cut(vPixelPos.x, vPixelPos.y, vPixelPos.w);
    // float cutRight = cut(vPixelPos.z, vPixelPos.y, vPixelPos.w);
    // float clip = (cutLeft + cutRight) / 2.0;

    float d = (vPixelPos.z - vPixelPos.x);
    float clip = 0.0;
    for (float i = 0.0; i < N; i += 1.) {
        clip += cut(vPixelPos.x + d * i * step, vPixelPos.y, vPixelPos.w);
    }
    clip *= div;

    gl_FragColor = uColor * clip + uGeomColor * (1.0 - clip);
}`;

    export class PlotShader extends PIXI.MeshMaterial {
        static _prog: PIXI.Program = null;

        static getProgram(): PIXI.Program {
            if (!PlotShader._prog) {
                PlotShader._prog = new PIXI.Program(plotVert, plotFrag);
            }
            return PlotShader._prog;
        }

        constructor() {
            super(PIXI.Texture.WHITE, {
                uniforms: {
                    resolution: 1,
                    lineWidth: new Float32Array([1, 0]),
                    miterLimit: 5,
                    uGeomColor: new Float32Array([0, 0, 0, 0]),
                },
                program: PlotShader.getProgram()
            });
        }
    }

    import TYPES = PIXI.TYPES;

    export class PlotGeometry extends PIXI.Geometry {
        constructor(_static = false) {
            super();
            this.initGeom(_static);
            this.reset();
        }

        jointStyle = PIXI.LINE_JOIN.BEVEL;
        lastLen = 0;
        lastPointNum = 0;
        lastPointData = 0;
        updateId = 0;
        points: Array<number> = [];
        _floatView: Float32Array = null;
        _u32View: Uint32Array = null;
        _buffer: PIXI.Buffer = null;
        _quad: PIXI.Buffer = null;
        _indexBuffer: PIXI.Buffer = null;

        initGeom(_static: boolean) {
            this._buffer = new PIXI.Buffer(new Float32Array(0), _static, false);

            this._quad = new PIXI.Buffer(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), true, false);

            this._indexBuffer = new PIXI.Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), true, true);

            this.addAttribute('aPoint0', this._buffer, 2, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aPoint1', this._buffer, 2, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aSides', this._buffer, 2, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aQuad', this._quad, 2, false, TYPES.FLOAT)
                .addIndex(this._indexBuffer);
        }

        stridePoints = 2;
        strideFloats = 6;
        strideBytes = 24;

        moveTo(x: number, y: number) {
            const {points} = this;
            points.push(x);
            points.push(y);
        }

        lineTo(x: number, y: number) {
            const {points} = this;
            points.push(x);
            points.push(y);
        }


        lineBy(dx: number, dy: number) {
            const {points, stridePoints} = this;

            const x = points[points.length - stridePoints];
            const y = points[points.length - stridePoints + 1];

            points.push(x + dx);
            points.push(y + dy);
        }

        invalidate(pointNum = 0) {
            this.lastPointNum = Math.min(pointNum, this.lastPointNum);
            this.updateId++;
        }

        reset() {
            if (this.lastLen > 0) {
                this.clearBufferData();
            }
            this.updateId++;
            this.lastLen = 0;
            this.lastPointData = 0;
            this.points.length = 0;
            this.instanceCount = 0;
        }

        clearBufferData() {
            const {points, strideBytes, stridePoints} = this;
            this.lastPointNum = 0;
            this.lastPointData = 0;
            const arrayLen = Math.max(0, points.length / stridePoints - 1);
            const arrBuf = new ArrayBuffer(strideBytes * arrayLen);
            this.lastLen = points.length;
            this._floatView = new Float32Array(arrBuf);
            this._u32View = new Uint32Array(arrBuf);
            this._buffer.update(arrBuf);
        }

        updateBuffer() {
            const {points, stridePoints, strideFloats} = this;

            if (this.lastLen > points.length) {
                this.lastLen = -1;
            }
            if (this.lastLen < points.length
                || this.lastPointNum < this.lastLen) { // TODO: partial upload
                this.clearBufferData();
            }

            if (this.lastPointNum == this.lastLen) {
                return;
            }

            const {_floatView, _u32View} = this;
            const bevel = this.jointStyle === PIXI.LINE_JOIN.BEVEL;
            this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
            let j = Math.round(this.lastPointNum * strideFloats / stridePoints); //actually that's int division
            for (let i = this.lastPointNum; i < points.length - stridePoints; i += stridePoints) {
                const prev = i - stridePoints;
                const next = i + stridePoints;
                const next2 = i + stridePoints * 2;

                _floatView[j++] = points[i];
                _floatView[j++] = points[i + 1];
                _floatView[j++] = points[next];
                _floatView[j++] = points[next + 1];

                const dx = points[next] - points[i];
                const dy = points[next + 1] - points[i + 1];
                const D = Math.sqrt(dx * dx + dy * dy);

                const k = dy / dx;
                if (prev >= 0) {
                    const dx2 = points[i] - points[prev];
                    const dy2 = points[i + 1] - points[prev + 1];
                    if (bevel) {
                        const D2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                        _floatView[j++] = (dy2 * D + dy * D2) / (dx2 * D + dx * D2);
                    } else {
                        _floatView[j++] = dy2 / dx2;
                    }
                } else {
                    _floatView[j++] = k;
                }

                if (next2 < points.length) {
                    const dx2 = points[next2] - points[next];
                    const dy2 = points[next2 + 1] - points[next + 1];
                    if (bevel) {
                        const D2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                        _floatView[j++] = (dy2 * D + dy * D2) / (dx2 * D + dx * D2);
                    } else {
                        _floatView[j++] = dy2 / dx2;
                    }
                } else {
                    _floatView[j++] = k;
                }
            }
            this._buffer.update();
            this.instanceCount = Math.round(points.length / stridePoints - 1);

            this.lastPointNum = this.lastLen;
            this.lastPointData = this.lastLen; // TODO: partial upload

            if (this.legacyGeom) {
                this.updateLegacy();
            }
        }

        legacyGeom: PIXI.Geometry = null;
        legacyBuffer: PIXI.Buffer = null;

        initLegacy() {
            if (this.legacyGeom) {
                return;
            }
            this.legacyGeom = new PIXI.Geometry();
            this.legacyBuffer = new PIXI.Buffer(new Float32Array(0), false, false);
            this.legacyGeom.addAttribute('aPoint0', this.legacyBuffer, 2, false, TYPES.FLOAT)
                .addAttribute('aPoint1', this.legacyBuffer, 2, false, TYPES.FLOAT)
                .addAttribute('aSides', this.legacyBuffer, 2, false, TYPES.FLOAT)
                .addAttribute('aQuad', this.legacyBuffer, 2, false, TYPES.FLOAT)
                .addIndex(new PIXI.Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), false, true));
        }

        updateLegacy() {
            const {legacyBuffer, _floatView, _u32View, strideFloats} = this;
            const strideLegacy = 8;
            const quadsCount = this._floatView.length / strideFloats;
            const legacyLen = quadsCount * strideLegacy * 4;
            if ((legacyBuffer.data as Float32Array).length !== legacyLen) {
                legacyBuffer.data = new Float32Array(legacyLen);
                this.legacyGeom.getIndex().update(PIXI.utils.createIndicesForQuads(quadsCount));
            }
            const floats: Float32Array = legacyBuffer.data as any;
            const quad: Float32Array = this._quad.data as any;

            for (let i = 0, j = 0; i < this._floatView.length;) {
                for (let k = 0; k < 4; k++) {
                    floats[j++] = _floatView[i];
                    floats[j++] = _floatView[i + 1];
                    floats[j++] = _floatView[i + 2];
                    floats[j++] = _floatView[i + 3];
                    floats[j++] = _floatView[i + 4];
                    floats[j++] = _floatView[i + 5];
                    floats[j++] = quad[k * 2]
                    floats[j++] = quad[k * 2 + 1];
                }
                i += strideFloats;
            }
        }
    }

    export interface PlotOptions {
        lineWidth?: number;
        nativeLineWidth?: number;
        jointStyle?: PIXI.LINE_JOIN;
    }

    export class Plot extends PIXI.Mesh {
        constructor(options: PlotOptions) {
            const geometry = new PlotGeometry();
            const shader = new PlotShader();
            if (options) {
                if (options.jointStyle !== undefined) {
                    geometry.jointStyle = options.jointStyle;
                }
                if (options.lineWidth !== undefined) {
                    shader.uniforms.lineWidth[0] = options.lineWidth;
                }
                if (options.nativeLineWidth !== undefined) {
                    shader.uniforms.lineWidth[1] = options.nativeLineWidth;
                }
            }

            super(geometry, shader);
        }

        moveTo(x: number, y: number) {
            const geometry = this.geometry as PlotGeometry;
            geometry.moveTo(x, y);
        }

        lineTo(x: number, y: number) {
            const geometry = this.geometry as PlotGeometry;
            geometry.lineTo(x, y);
        }

        lineBy(x: number, y: number) {
            const geometry = this.geometry as PlotGeometry;
            geometry.lineBy(x, y);
        }

        lineStyle(width?: number, nativeWidth?: number, jointStyle?: number) {
            const geometry = this.geometry as PlotGeometry;
            if (width !== undefined) {

                this.shader.uniforms.lineWidth[0] = width;
            }
            if (nativeWidth !== undefined) {
                this.shader.uniforms.lineWidth[1] = nativeWidth;
            }
            if (jointStyle !== undefined) {
                geometry.jointStyle = jointStyle;
            }
            geometry.invalidate();
        }

        clear() {
            (this.geometry as PlotGeometry).reset();
        }

        _renderDefault(renderer: PIXI.Renderer): void {
            const geometry = this.geometry as PlotGeometry;

            const useLegacy = !renderer.geometry.hasInstance;
            if (useLegacy) {
                geometry.initLegacy();
            }
            geometry.updateBuffer();
            if (geometry.instanceCount === 0) {
                return;
            }
            const rt = renderer.renderTexture.current;
            this.shader.uniforms.resolution = rt ? rt.baseTexture.resolution : renderer.resolution;

            if (useLegacy) {
                // hacky!
                (this as any).geometry = geometry.legacyGeom;
                super._renderDefault(renderer);
                (this as any).geometry = geometry;
                return;
            }
            super._renderDefault(renderer);
        }

        _renderCanvas(renderer: PIXI.CanvasRenderer): void {
            const {points, stridePoints} = this.geometry as BarsGeometry;
            const {context} = renderer;
            const len = points.length;
            if (len < 2) {
                return;
            }
            const wt = this.transform.worldTransform;
            renderer.setContextTransform(wt);

            const scale = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
            context.lineWidth = this.shader.uniforms.lineWidth[0] + this.shader.uniforms.lineWidth[1] / scale;

            context.strokeStyle = PIXI.utils.hex2string(this.tint);
            context.globalAlpha = this.worldAlpha;

            context.beginPath();
            context.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length; i += stridePoints) {
                context.lineTo(points[i], points[i + 1]);
            }
            context.stroke();
            context.beginPath();

            context.globalAlpha = 1.0;
        }
    }
}
