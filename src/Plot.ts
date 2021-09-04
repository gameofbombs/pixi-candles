import {Buffer, Geometry, Program, Texture, Renderer} from '@pixi/core';
import {CanvasRenderer} from '@pixi/canvas-renderer';
import {Mesh, MeshMaterial} from '@pixi/mesh';
import {createIndicesForQuads, hex2string} from '@pixi/utils';
import {LINE_JOIN, LINE_CAP} from '@pixi/graphics';
import {TYPES} from '@pixi/constants';

export enum JOINT_TYPE {
    NONE = 0,
    FILL = 1,
    JOINT_BEVEL = 4,
    JOINT_MITER = 8,
    JOINT_ROUND = 12,
    JOINT_CAP_BUTT = 16,
    JOINT_CAP_SQUARE = 18,
    JOINT_CAP_ROUND = 20,
    FILL_EXPAND = 24,
    CAP_BUTT = 1 << 5,
    CAP_SQUARE = 2 << 5,
    CAP_ROUND = 3 << 5,
    CAP_BUTT2 = 4 << 5,
}

const plotVert = `precision highp float;
const float FILL = 1.0;
const float BEVEL = 4.0;
const float MITER = 8.0;
const float ROUND = 12.0;
const float JOINT_CAP_BUTT = 16.0;
const float JOINT_CAP_SQUARE = 18.0;
const float JOINT_CAP_ROUND = 20.0;

const float FILL_EXPAND = 24.0;

const float CAP_BUTT = 1.0;
const float CAP_SQUARE = 2.0;
const float CAP_ROUND = 3.0;
const float CAP_BUTT2 = 4.0;

// === geom ===
attribute vec2 aPrev;
attribute vec2 aPoint1;
attribute vec2 aPoint2;
attribute vec2 aNext;
attribute float aVertexJoint;
attribute float vertexNum;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;

varying vec4 vDistance;
varying float vType;

uniform float resolution;
uniform float expand;
uniform float miterLimit;
uniform vec2 styleLine;

vec2 doBisect(vec2 norm, float len, vec2 norm2, float len2,
    float dy, float inner) {
    vec2 bisect = (norm + norm2) / 2.0;
    bisect /= dot(norm, bisect);
    vec2 shift = dy * bisect;
    if (inner > 0.5) {
        if (len < len2) {
            if (abs(dy * (bisect.x * norm.y - bisect.y * norm.x)) > len) {
                return dy * norm;
            }
        } else {
            if (abs(dy * (bisect.x * norm2.y - bisect.y * norm2.x)) > len2) {
                return dy * norm;
            }
        }
    }
    return dy * bisect;
}

void main(void){
    vec2 pointA = (translationMatrix * vec3(aPoint1, 1.0)).xy;
    vec2 pointB = (translationMatrix * vec3(aPoint2, 1.0)).xy;

    vec2 xBasis = pointB - pointA;
    float len = length(xBasis);
    vec2 forward = xBasis / len;
    vec2 norm = vec2(forward.y, -forward.x);

    float type = aVertexJoint;

    vec2 avgDiag = (translationMatrix * vec3(1.0, 1.0, 0.0)).xy;
    float avgScale = sqrt(dot(avgDiag, avgDiag) * 0.5);

    float capType = floor(type / 32.0);
    type -= capType * 32.0;

    float lineWidth = styleLine.x;
    if (lineWidth < 0.0) {
        lineWidth = -lineWidth;
    } else {
        lineWidth = lineWidth * avgScale;
    }
    lineWidth *= 0.5;
    float lineAlignment = 2.0 * styleLine.y - 1.0;

    vec2 pos;

    if (capType == CAP_ROUND) {
        if (vertexNum < 3.5) {
            gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
        type = JOINT_CAP_ROUND;
        capType = 0.0;
    }

    if (type >= BEVEL) {
        float dy = lineWidth + expand;
        float inner = 0.0;
        if (vertexNum >= 1.5) {
            dy = -dy;
            inner = 1.0;
        }

        vec2 base, next, xBasis2, bisect;
        float flag = 0.0;
        float sign2 = 1.0;
        if (vertexNum < 0.5 || vertexNum > 2.5 && vertexNum < 3.5) {
            next = (translationMatrix * vec3(aPrev, 1.0)).xy;
            base = pointA;
            flag = type - floor(type / 2.0) * 2.0;
            sign2 = -1.0;
        } else {
            next = (translationMatrix * vec3(aNext, 1.0)).xy;
            base = pointB;
            if (type >= MITER && type < MITER + 3.5) {
                flag = step(MITER + 1.5, type);
                // check miter limit here?
            }
        }
        xBasis2 = next - base;
        float len2 = length(xBasis2);
        vec2 norm2 = vec2(xBasis2.y, -xBasis2.x) / len2;
        float D = norm.x * norm2.y - norm.y * norm2.x;
        if (D < 0.0) {
            inner = 1.0 - inner;
        }

        norm2 *= sign2;

        if (abs(lineAlignment) > 0.01) {
            float shift = lineWidth * lineAlignment;
            pointA += norm * shift;
            pointB += norm * shift;
            if (abs(D) < 0.01) {
                base += norm * shift;
            } else {
                base += doBisect(norm, len, norm2, len2, shift, 0.0);
            }
        }

        float collinear = step(0.0, dot(norm, norm2));

        vType = 0.0;
        float dy2 = -1000.0;
        float dy3 = -1000.0;

        if (abs(D) < 0.01 && collinear < 0.5) {
            if (type >= ROUND && type < ROUND + 1.5) {
                type = JOINT_CAP_ROUND;
            }
            //TODO: BUTT here too
        }

        if (vertexNum < 3.5) {
            if (abs(D) < 0.01) {
                pos = dy * norm;
            } else {
                if (flag < 0.5 && inner < 0.5) {
                    pos = dy * norm;
                } else {
                    pos = doBisect(norm, len, norm2, len2, dy, inner);
                }
            }
            if (capType >= CAP_BUTT && capType < CAP_ROUND) {
                float extra = step(CAP_SQUARE, capType) * lineWidth;
                vec2 back = -forward;
                if (vertexNum < 0.5 || vertexNum > 2.5) {
                    pos += back * (expand + extra);
                    dy2 = expand;
                } else {
                    dy2 = dot(pos + base - pointA, back) - extra;
                }
            }
            if (type >= JOINT_CAP_BUTT && type < JOINT_CAP_SQUARE + 0.5) {
                float extra = step(JOINT_CAP_SQUARE, type) * lineWidth;
                if (vertexNum < 0.5 || vertexNum > 2.5) {
                    dy3 = dot(pos + base - pointB, forward) - extra;
                } else {
                    pos += forward * (expand + extra);
                    dy3 = expand;
                    if (capType >= CAP_BUTT) {
                        dy2 -= expand + extra;
                    }
                }
            }
        } else if (type >= JOINT_CAP_ROUND && type < JOINT_CAP_ROUND + 1.5) {
            if (inner > 0.5) {
                dy = -dy;
                inner = 0.0;
            }
            vec2 d2 = abs(dy) * vec2(-norm.y, norm.x);
            if (vertexNum < 4.5) {
                dy = -dy;
                pos = dy * norm;
            } else if (vertexNum < 5.5) {
                pos = dy * norm;
            } else if (vertexNum < 6.5) {
                pos = dy * norm + d2;
            } else {
                dy = -dy;
                pos = dy * norm + d2;
            }
            dy = -0.5;
            dy2 = pos.x;
            dy3 = pos.y;
            vType = 3.0;
        } else if (abs(D) < 0.01) {
            pos = dy * norm;
        } else {
            if (type >= ROUND && type < ROUND + 1.5) {
                if (inner > 0.5) {
                    dy = -dy;
                    inner = 0.0;
                }
                if (vertexNum < 4.5) {
                    pos = doBisect(norm, len, norm2, len2, -dy, 1.0);
                } else if (vertexNum < 5.5) {
                    pos = dy * norm;
                } else if (vertexNum > 7.5) {
                    pos = dy * norm2;
                } else {
                    pos = doBisect(norm, len, norm2, len2, dy, 0.0);
                    float d2 = abs(dy);
                    if (length(pos) > abs(dy) * 1.5) {
                        if (vertexNum < 6.5) {
                            pos.x = dy * norm.x - d2 * norm.y;
                            pos.y = dy * norm.y + d2 * norm.x;
                        } else {
                            pos.x = dy * norm2.x + d2 * norm2.y;
                            pos.y = dy * norm2.y - d2 * norm2.x;
                        }
                    }
                }
                vec2 norm3 = normalize(norm - norm2);
                dy = pos.x * norm3.y - pos.y * norm3.x - 1.0;
                dy2 = pos.x;
                dy3 = pos.y;
                vType = 3.0;
            } else {
                float hit = 0.0;
                if (type >= MITER && type < MITER + 3.5) {
                    if (inner > 0.5) {
                        dy = -dy;
                        inner = 0.0;
                    }
                    float sign = step(0.0, dy) * 2.0 - 1.0;
                    pos = doBisect(norm, len, norm2, len2, dy, 0.0);
                    if (length(pos) > abs(dy) * miterLimit) {
                        type = BEVEL;
                    } else {
                        if (vertexNum < 4.5) {
                            dy = -dy;
                            pos = doBisect(norm, len, norm2, len2, dy, 1.0);
                        } else if (vertexNum < 5.5) {
                            pos = dy * norm;
                        } else if (vertexNum > 6.5) {
                            pos = dy * norm2;
                            // dy = ...
                        }
                        vType = 1.0;
                        dy = -sign * dot(pos, norm);
                        dy2 = -sign * dot(pos, norm2);
                        hit = 1.0;
                    }
                }
                if (type >= BEVEL && type < BEVEL + 1.5) {
                    if (inner > 0.5) {
                        dy = -dy;
                        inner = 0.0;
                    }
                    float d2 = abs(dy);
                    vec2 pos3 = vec2(dy * norm.x - d2 * norm.y, dy * norm.y + d2 * norm.x);
                    vec2 pos4 = vec2(dy * norm2.x + d2 * norm2.y, dy * norm2.y - d2 * norm2.x);
                    if (vertexNum < 4.5) {
                        pos = doBisect(norm, len, norm2, len2, -dy, 1.0);
                    } else if (vertexNum < 5.5) {
                        pos = dy * norm;
                    } else if (vertexNum > 7.5) {
                        pos = dy * norm2;
                    } else {
                        if (vertexNum < 6.5) {
                            pos = pos3;
                        } else {
                            pos = pos4;
                        }
                    }
                    vec2 norm3 = normalize(norm + norm2);
                    float sign = step(0.0, dy) * 2.0 - 1.0;

                    dy = -sign * dot(pos, norm);
                    dy2 = -sign * dot(pos, norm2);
                    dy3 = (-sign * dot(pos, norm3)) + lineWidth;
                    vType = 4.0;
                    hit = 1.0;
                }
                if (hit < 0.5) {
                    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
                    return;
                }
            }
        }

        pos += base;
        vDistance = vec4(dy, dy2, dy3, lineWidth) * resolution;
    }

    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
}`;

const plotFrag = `precision highp float;
varying vec4 vDistance;
varying float vType;
uniform vec4 uColor;

void main(void){
    float alpha = 1.0;
    float lineWidth = vDistance.w;
    if (vType < 0.5) {
        float left = max(vDistance.x - 0.5, -vDistance.w);
        float right = min(vDistance.x + 0.5, vDistance.w);
        float near = vDistance.y - 0.5;
        float far = min(vDistance.y + 0.5, 0.0);
        float top = vDistance.z - 0.5;
        float bottom = min(vDistance.z + 0.5, 0.0);
        alpha = max(right - left, 0.0) * max(bottom - top, 0.0) * max(far - near, 0.0);
    } else if (vType < 1.5) {
        float a1 = clamp(vDistance.x + 0.5 - lineWidth, 0.0, 1.0);
        float a2 = clamp(vDistance.x + 0.5 + lineWidth, 0.0, 1.0);
        float b1 = clamp(vDistance.y + 0.5 - lineWidth, 0.0, 1.0);
        float b2 = clamp(vDistance.y + 0.5 + lineWidth, 0.0, 1.0);
        alpha = a2 * b2 - a1 * b1;
    } else if (vType < 2.5) {
        alpha *= max(min(vDistance.x + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.y + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.z + 0.5, 1.0), 0.0);
    } else if (vType < 3.5) {
        float dist2 = sqrt(dot(vDistance.yz, vDistance.yz));
        float rad = vDistance.w;
        float left = max(dist2 - 0.5, -rad);
        float right = min(dist2 + 0.5, rad);
        // TODO: something has to be done about artifact at vDistance.x far side
        alpha = 1.0 - step(vDistance.x, 0.0) * (1.0 - max(right - left, 0.0));
    } else {
        float a1 = clamp(vDistance.x + 0.5 - lineWidth, 0.0, 1.0);
        float a2 = clamp(vDistance.x + 0.5 + lineWidth, 0.0, 1.0);
        float b1 = clamp(vDistance.y + 0.5 - lineWidth, 0.0, 1.0);
        float b2 = clamp(vDistance.y + 0.5 + lineWidth, 0.0, 1.0);
        alpha = a2 * b2 - a1 * b1;
        alpha *= max(min(vDistance.z + 0.5, 1.0), 0.0);
    }
    gl_FragColor = uColor * alpha;
}
`;

export class PlotShader extends MeshMaterial {
    static _prog: Program = null;

    static getProgram(): Program {
        if (!PlotShader._prog) {
            PlotShader._prog = new Program(plotVert, plotFrag);
        }
        return PlotShader._prog;
    }

    constructor() {
        super(Texture.WHITE, {
            uniforms: {
                resolution: 1,
                expand: 1,
                styleLine: new Float32Array([1.0, 0.5]),
                miterLimit: 5.0,
            },
            program: PlotShader.getProgram()
        });
    }
}

export function multIndex(indices: Uint32Array, vertCount: number, instanceCount: number, support32 = true) {
    const size = indices.length;
    const ind = support32 ? new Uint32Array(size * instanceCount) : new Uint16Array(size * instanceCount);
    for (let i = 0; i < instanceCount; i++) {
        for (let j = 0; j < size; j++) {
            ind[i * size + j] = indices[j] + vertCount * i;
        }
    }
    return ind;
}

export class PlotGeometry extends Geometry {
    constructor(_static = false) {
        super();
        this.initGeom(_static);
        this.reset();
    }

    joinStyle = LINE_JOIN.MITER;
    capStyle = LINE_CAP.SQUARE;

    lastLen = 0;
    lastPointNum = 0;
    lastPointData = 0;
    updateId = 0;
    points: Array<number> = [];
    _floatView: Float32Array = null;
    _u32View: Uint32Array = null;
    _buffer: Buffer = null;
    _quad: Buffer = null;
    _indexBuffer: Buffer = null;
    _vertexNums: Buffer = null;
    support32 = false;

    initGeom(_static: boolean) {
        this._buffer = new Buffer(new Float32Array(0), _static, false);

        this._vertexNums = new Buffer(new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8]), true, false);

        this._indexBuffer = new Buffer(new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 4, 7, 8]), true, true);

        this.addAttribute('aPrev', this._buffer, 2, false, TYPES.FLOAT, 3 * 4, 0 * 4, true)
            .addAttribute('aPoint1', this._buffer, 2, false, TYPES.FLOAT, 3 * 4, 3 * 4, true)
            .addAttribute('aPoint2', this._buffer, 2, false, TYPES.FLOAT, 3 * 4, 6 * 4, true)
            .addAttribute('aNext', this._buffer, 2, false, TYPES.FLOAT, 3 * 4, 9 * 4, true)
            .addAttribute('aVertexJoint', this._buffer, 1, false, TYPES.FLOAT, 3 * 4, 5 * 4, true)
            .addAttribute('vertexNum', this._vertexNums, 1, false, TYPES.FLOAT)
            .addIndex(this._indexBuffer);
    }

    stridePoints = 2;
    strideFloats = 3;
    strideBytes = 3 * 4;

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
        const arrayLen = Math.max(0, points.length / stridePoints + 3);
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

        const jointType = this.jointType();
        const capType = this.capType();
        let endJoint = capType;
        if (capType === JOINT_TYPE.CAP_ROUND) {
            endJoint = JOINT_TYPE.JOINT_CAP_ROUND;
        }
        if (capType === JOINT_TYPE.CAP_BUTT) {
            endJoint = JOINT_TYPE.JOINT_CAP_BUTT;
        }
        if (capType === JOINT_TYPE.CAP_SQUARE) {
            endJoint = JOINT_TYPE.JOINT_CAP_SQUARE;
        }

        const {_floatView, _u32View} = this;

        if (this.lastPointNum > 0) {
            this.lastPointNum--;
        }
        if (this.lastPointNum > 0) {
            this.lastPointNum--;
        }

        this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
        let j = (Math.round(this.lastPointNum / stridePoints) + 2) * strideFloats; //actually that's int division

        for (let i = this.lastPointNum; i < points.length; i += stridePoints) {
            _floatView[j++] = points[i];
            _floatView[j++] = points[i + 1];
            _floatView[j] = jointType;
            if (i == 0 && capType !== JOINT_TYPE.CAP_ROUND) {
                _floatView[j] += capType;
            }
            if (i + stridePoints * 2 >= points.length) {
                _floatView[j] += endJoint - jointType;
            } else if (i + stridePoints >= points.length) {
                _floatView[j] = 0;
            }
            j++;
        }
        _floatView[j++] = points[points.length - 4];
        _floatView[j++] = points[points.length - 2];
        _floatView[j++] = 0;
        _floatView[0] = points[0];
        _floatView[1] = points[1];
        _floatView[2] = 0;
        _floatView[3] = points[2];
        _floatView[4] = points[3];
        _floatView[5] = capType === JOINT_TYPE.CAP_ROUND ? capType : 0;

        //TODO: update from first modified float
        this._buffer.update();
        this.instanceCount = Math.round(points.length / stridePoints);

        this.lastPointNum = this.lastLen;
        this.lastPointData = this.lastLen; // TODO: partial upload

        if (this.legacyGeom) {
            this.updateLegacy();
        }
    }

    legacyGeom: Geometry = null;
    legacyBuffer: Buffer = null;

    initLegacy(support32: boolean) {
        if (this.legacyGeom) {
            return;
        }
        const ind = [0, 1, 2, 0, 2, 3];
        this.support32 = support32;
        this.legacyGeom = new Geometry();
        this.legacyBuffer = new Buffer(new Float32Array(0), false, false);
        this.legacyGeom.addAttribute('aPrev', this.legacyBuffer, 2, false, TYPES.FLOAT)
            .addAttribute('aPoint1', this.legacyBuffer, 2, false, TYPES.FLOAT)
            .addAttribute('aPoint2', this.legacyBuffer, 2, false, TYPES.FLOAT)
            .addAttribute('aNext', this.legacyBuffer, 2, false, TYPES.FLOAT)
            .addAttribute('aVertexJoint', this.legacyBuffer, 1, false, TYPES.FLOAT)
            .addAttribute('vertexNum', this.legacyBuffer, 1, false, TYPES.FLOAT)
            .addIndex(new Buffer(support32? new Uint32Array(ind): new Uint16Array(ind), false, true));
    }

    updateLegacy() {
        const {legacyBuffer, _floatView, _u32View, strideFloats} = this;
        const strideLegacy = 10;
        const vcount = 9;
        const instanceCount = (this._floatView.length / strideFloats - 3);
        const legacyLen = instanceCount * strideLegacy * vcount;
        if ((legacyBuffer.data as Float32Array).length !== legacyLen) {
            legacyBuffer.data = new Float32Array(legacyLen);
            this.legacyGeom.getIndex().update(multIndex(this._indexBuffer.data as any, vcount, instanceCount, this.support32));
        }
        const floats: Float32Array = legacyBuffer.data as any;
        for (let i = 0, j = 0; j < legacyLen; i += strideFloats) {
            for (let k = 0; k < vcount; k++) {
                floats[j++] = _floatView[i];
                floats[j++] = _floatView[i + 1];
                floats[j++] = _floatView[i + 3];
                floats[j++] = _floatView[i + 4];
                floats[j++] = _floatView[i + 6];
                floats[j++] = _floatView[i + 7];
                floats[j++] = _floatView[i + 9];
                floats[j++] = _floatView[i + 10];
                floats[j++] = _floatView[i + 5];
                floats[j++] = k;
            }
        }
    }

    /**
     * copied from graphics-smooth
     */
    public capType() {
        let cap: number;

        switch (this.capStyle) {
            case LINE_CAP.SQUARE:
                cap = JOINT_TYPE.CAP_SQUARE;
                break;
            case LINE_CAP.ROUND:
                cap = JOINT_TYPE.CAP_ROUND;
                break;
            default:
                cap = JOINT_TYPE.CAP_BUTT;
                break;
        }

        return cap;
    }

    /**
     * copied from graphics-smooth
     */
    public goodJointType() {
        let joint: number;

        switch (this.joinStyle) {
            case LINE_JOIN.BEVEL:
                joint = JOINT_TYPE.JOINT_BEVEL;
                break;
            case LINE_JOIN.ROUND:
                joint = JOINT_TYPE.JOINT_ROUND;
                break;
            default:
                joint = JOINT_TYPE.JOINT_MITER + 3;
                break;
        }

        return joint;
    }

    /**
     * copied from graphics-smooth
     */
    public jointType() {
        let joint: number;

        switch (this.joinStyle) {
            case LINE_JOIN.BEVEL:
                joint = JOINT_TYPE.JOINT_BEVEL;
                break;
            case LINE_JOIN.ROUND:
                joint = JOINT_TYPE.JOINT_ROUND;
                break;
            default:
                joint = JOINT_TYPE.JOINT_MITER;
                break;
        }

        return joint;
    }
}

export interface PlotOptions {
    lineWidth?: number;
    nativeLineWidth?: number;
    joinStyle?: LINE_JOIN;
    capStyle?: LINE_CAP;
}

export class Plot extends Mesh {
    constructor(options: PlotOptions) {
        const geometry = new PlotGeometry();
        const shader = new PlotShader();
        if (options) {
            if (options.lineWidth !== undefined) {
                shader.uniforms.styleLine[0] = options.lineWidth;
            }
            if (options.nativeLineWidth !== undefined) {
                shader.uniforms.styleLine[0] = options.nativeLineWidth;
            }
            if (options.joinStyle !== undefined) {
                geometry.joinStyle = options.joinStyle;
            }
            if (options.capStyle !== undefined) {
                geometry.capStyle = options.capStyle;
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

    lineStyle(width?: number, nativeWidth?: number, joinStyle?: LINE_JOIN, capStyle?: LINE_CAP) {
        const geometry = this.geometry as PlotGeometry;
        if (width !== undefined) {

            this.shader.uniforms.styleLine[0] = width;
        }
        if (nativeWidth !== undefined) {
            this.shader.uniforms.styleLine[0] = -nativeWidth;
        }
        if (joinStyle !== undefined) {
            geometry.joinStyle = joinStyle;
        }
        if (capStyle !== undefined) {
            geometry.capStyle = capStyle;
        }
        geometry.invalidate();
    }

    clear() {
        (this.geometry as PlotGeometry).reset();
    }

    _renderDefault(renderer: Renderer): void {
        const geometry = this.geometry as PlotGeometry;

        if (geometry.points.length < 4) {
            return;
        }

        const useLegacy = !renderer.geometry.hasInstance;
        if (useLegacy) {
            geometry.initLegacy(renderer.context.supports.uint32Indices);
        }
        geometry.updateBuffer();
        if (geometry.instanceCount === 0) {
            return;
        }
        const rt = renderer.renderTexture.current;
        const multisample = rt ? rt.framebuffer.multisample > 1 : renderer.options.antialias;
        const resolution = this.shader.uniforms.resolution = (rt ? rt.baseTexture.resolution : renderer.resolution);
        this.shader.uniforms.expand = (multisample ? 2 : 1) / resolution;

        if (useLegacy) {
            // hacky!
            (this as any).geometry = geometry.legacyGeom;
            super._renderDefault(renderer);
            (this as any).geometry = geometry;
            return;
        }
        super._renderDefault(renderer);
    }

    _renderCanvas(renderer: CanvasRenderer): void {
        const {points, stridePoints} = this.geometry as PlotGeometry;
        const {context} = renderer;
        const len = points.length;
        if (len < 2) {
            return;
        }
        const wt = this.transform.worldTransform;
        renderer.setContextTransform(wt);

        const scale = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
        context.lineWidth = this.shader.uniforms.styleLine[0] + this.shader.uniforms.styleLine[1] / scale;

        context.strokeStyle = hex2string(this.tint);
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
