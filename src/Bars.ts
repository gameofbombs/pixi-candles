namespace pixi_candles {
    const barVert = `
attribute vec4 aRect;
attribute vec2 aQuad;
attribute vec4 aColor;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform float resolution;
uniform vec4 uColor;

varying vec4 vPixelPos;
varying vec4 vPixelRect;
varying vec4 vColor;

void main(void){
    vec2 p1 = (translationMatrix * vec3(aRect.xy, 1.0)).xy;
    vec2 p2 = (translationMatrix * vec3(aRect.xy + aRect.zw, 1.0)).xy;

    vec2 leftTop = p1;
    vec2 rightBottom = p2;
    vec2 sign = aQuad;

    // handle negative width/height, or translationMatrix .a .d < 0
    if (p1.x > p2.x) {
        sign.x = 1.0 - aQuad.x;
        leftTop.x = p2.x;
        rightBottom.x = p1.x;
    }
    if (p1.y > p2.y) {
        sign.y = 1.0 - aQuad.y;
        leftTop.y = p2.y;
        rightBottom.y = p1.y;
    }

    vPixelRect = vec4(leftTop * resolution, rightBottom * resolution);

    vec2 pos = (translationMatrix * vec3(aRect.xy + aRect.zw * aQuad, 1.0)).xy;
    pos = floor(pos * resolution + 0.01 + sign * 0.98);
    vPixelPos = vec4(pos - 0.5, pos + 0.5);
    gl_Position = vec4((projectionMatrix * vec3(pos / resolution, 1.0)).xy, 0.0, 1.0);

    vColor = aColor * uColor;
}`;
    const barFrag = `
varying vec4 vPixelPos;
varying vec4 vPixelRect;
varying vec4 vColor;

void main(void) {
    vec2 leftTop = max(vPixelPos.xy, vPixelRect.xy);
    vec2 rightBottom = min(vPixelPos.zw, vPixelRect.zw);
    vec2 area = max(rightBottom - leftTop, 0.0);
    float clip = area.x * area.y;

    gl_FragColor = vColor * clip;
}`;

    export class BarsShader extends PIXI.MeshMaterial {
        static _prog: PIXI.Program = null;

        static getProgram(): PIXI.Program {
            if (!BarsShader._prog) {
                BarsShader._prog = new PIXI.Program(barVert, barFrag);
            }
            return BarsShader._prog;
        }

        constructor() {
            super(PIXI.Texture.WHITE, {
                uniforms: {
                    resolution: 1
                },
                program: BarsShader.getProgram()
            });
        }
    }

    import TYPES = PIXI.TYPES;

    export class BarsGeometry extends PIXI.Geometry {
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
        _u32View: Uint32Array = null;
        _buffer: PIXI.Buffer = null;
        _quad: PIXI.Buffer = null;
        _indexBuffer: PIXI.Buffer = null;

        initGeom(_static: boolean) {
            this._buffer = new PIXI.Buffer(null, _static, false);

            this._quad = new PIXI.Buffer(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), true, false);

            this._indexBuffer = new PIXI.Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), true, true);

            this.addAttribute('aRect', this._buffer, 4, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aColor', this._buffer, 4, true, TYPES.UNSIGNED_BYTE, undefined, undefined, true)
                .addAttribute('aQuad', this._quad, 2, false, TYPES.FLOAT)
                .addIndex(this._indexBuffer);
        }
        stridePoints = 5;
        strideFloats = 5;
        strideBytes = 20;

        addRect(x: number, y: number, w: number, h: number, color: number) {
            const {points} = this;
            points.push(x);
            points.push(y);
            points.push(w);
            points.push(h);
            points.push(color);
        }

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
            const {points, strideBytes} = this;
            this.lastPointNum = 0;
            this.lastPointData = 0;
            const arrBuf = new ArrayBuffer(strideBytes * points.length);
            this.lastLen = points.length;
            this._floatView = new Float32Array(arrBuf);
            this._u32View = new Uint32Array(arrBuf);
            this._buffer.update(arrBuf);
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

            const {_floatView, _u32View} = this;
            this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
            let j = Math.round(this.lastPointNum * strideFloats / stridePoints); //actually that's int division
            for (let i = this.lastPointNum; i < points.length; i += stridePoints) {
                _floatView[j++] = points[i];
                _floatView[j++] = points[i + 1];
                _floatView[j++] = points[i + 2];
                _floatView[j++] = points[i + 3];

                const rgb = points[i + 4];
                const bgra = ((rgb >> 16) & 0xff) | (rgb & 0xff00) | ((rgb & 0xff) << 16) | (255<<24);
                _u32View[j++] = bgra;
            }
            this.instanceCount = Math.round(points.length / stridePoints);

            this.lastPointNum = this.lastLen;
            this.lastPointData = this.lastLen; // TODO: partial upload
        }
    }

    export class Bars extends PIXI.Mesh {
        constructor() {
            super(new BarsGeometry(), new BarsShader());
        }

        addRect(x: number, y: number, w: number, h: number, color: number) {
            const geometry = this.geometry as BarsGeometry;
            geometry.addRect(x, y, w, h, color);
        }

        _renderDefault(renderer: PIXI.Renderer): void
        {
            const geometry = this.geometry as BarsGeometry;
            geometry.updateBuffer();
            const rt = renderer.renderTexture.current;
            this.shader.uniforms.resolution = rt ? rt.baseTexture.resolution : renderer.resolution;
            super._renderDefault(renderer);
        }
    }
}
