import {
    AbstractBatchRenderer, BatchGeometry,
    BatchShaderGenerator,
    IBatchFactoryOptions,
    Program, Renderer,
    Shader,
    UniformGroup
} from '@pixi/core';
import {Matrix} from '@pixi/math';

const vert = `precision highp float;
attribute vec2 aPrev;
attribute vec2 aPoint1;
attribute vec2 aPoint2;
attribute vec2 aNext;
attribute float aLineStyle;
attribute float aVertexJoint;
attribute vec4 aColor;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying vec4 vSignedCoord;
varying vec4 vColor;
varying vec4 vDistance;

uniform float resolution;
uniform float expand;

void main(void){
    vec2 pointA = (translationMatrix * vec3(aPoint1, 1.0)).xy;
    vec2 pointB = (translationMatrix * vec3(aPoint2, 1.0)).xy;

    vec2 xBasis = pointB - pointA;
    vec2 norm = normalize(vec2(xBasis.y, -xBasis.x));

    float type = floor(aVertexJoint / 16.0);
    float vertexNum = aVertexJoint - type * 16.0;
    float dx = 0.0, dy = 1.0;

    float lineWidth = aLineStyle * 0.5;
    vec2 pos;
    if (type == 0.0) {
        pos = pointA;
        vDistance = vec4(0.0, 0.0, 0.0, 1.0);
    } else if (type >= 32.0) {
        // Fill AA

        float flags = type - 32.0;
        float flag3 = floor(flags / 4.0);
        float flag2 = floor((flags - flag3 * 4.0) / 2.0);
        float flag1 = flags - flag3 * 4.0 - flag2 * 2.0;

        vec2 prev = (translationMatrix * vec3(aPrev, 1.0)).xy;

        if (vertexNum < 0.5) {
            pos = prev;
        } else if (vertexNum < 1.5) {
            pos = pointA;
        } else {
            pos = pointB;
        }
        float len = length(aNext);
        vec2 bisect = (translationMatrix * vec3(aNext, 0.0)).xy;
        if (len > 0.01) {
            bisect = normalize(bisect) * len;
        }

        vec2 n1 = normalize(vec2(pointA.y - prev.y, -(pointA.x - prev.x)));
        vec2 n2 = normalize(vec2(pointB.y - pointA.y, -(pointB.x - pointA.x)));
        vec2 n3 = normalize(vec2(prev.y - pointB.y, -(prev.x - pointB.x)));

        if (n1.x * n2.y - n1.y * n2.x < 0.0) {
            n1 = -n1;
            n2 = -n2;
            n3 = -n3;
        }

        vDistance.w = 1.0;
        pos += bisect * expand;

        vDistance = vec4(16.0, 16.0, 16.0, -1.0);
        if (flag1 > 0.5) {
            vDistance.x = -dot(pos - prev, n1);
        }
        if (flag2 > 0.5) {
            vDistance.y = -dot(pos - pointA, n2);
        }
        if (flag3 > 0.5) {
            vDistance.z = -dot(pos - pointB, n3);
        }
        vDistance.xyz *= resolution;
    } else {
        vec2 prev = (translationMatrix * vec3(aPrev, 1.0)).xy;
        vec2 next = (translationMatrix * vec3(aNext, 1.0)).xy;

        float dy = lineWidth + expand;
        if (vertexNum >= 1.5) {
            dy = -dy;
        }
        vec2 base, bisect, norm2;
        if (vertexNum < 0.5 || vertexNum > 2.5) {
            vec2 prev = (translationMatrix * vec3(aPrev, 1.0)).xy;
            base = pointA;
            norm2 = normalize(vec2(pointA.y - prev.y, -(pointA.x - prev.x)));
        } else {
            vec2 next = (translationMatrix * vec3(aNext, 1.0)).xy;
            base = pointB;
            norm2 = normalize(vec2(next.y - pointB.y, -(next.x - pointB.x)));
        }
        if (abs(dot(norm, norm2)) > -0.001) {
            vec2 bisect = (norm + norm2) / 2.0;
            bisect /= dot(norm, bisect);

            pos = base + dy * bisect;
        } else {
            pos = base + dy * norm;
        }

        vDistance = vec4(dy, 0.0, 0.0, lineWidth) * resolution;
    }

    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);

    vColor = aColor * tint;
}`;

const frag = `
varying vec4 vColor;
varying vec4 vDistance;

//%forloop% %count%

void main(void){
    float alpha = 1.0;
    if (vDistance.w >= 0.0) {
        float left = max(vDistance.x - 0.5, -vDistance.w);
        float right = min(vDistance.x + 0.5, vDistance.w);
        alpha = right - left;
    } else {
        alpha *= max(min(vDistance.x + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.y + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.z + 0.5, 1.0), 0.0);
    }

    gl_FragColor = vColor * alpha;
}
`;

export class SmoothShaderGenerator extends BatchShaderGenerator {
    generateShader(maxTextures: number): Shader {
        if (!this.programCache[maxTextures]) {
            this.programCache[maxTextures] = new Program(this.vertexSrc, this.fragTemplate);
        }

        const uniforms = {
            tint: new Float32Array([1, 1, 1, 1]),
            translationMatrix: new Matrix(),
            resolution: 1,
            expand: 1,
        };

        return new Shader(this.programCache[maxTextures], uniforms);
    }

}

export class SmoothRendererFactory {
    static create(options?: IBatchFactoryOptions): typeof AbstractBatchRenderer {
        const {vertex, fragment, vertexSize, geometryClass} = Object.assign({
            vertex: vert,
            fragment: frag,
            geometryClass: BatchGeometry,
            vertexSize: 11,
        }, options);

        return class BatchPlugin extends AbstractBatchRenderer {
            constructor(renderer: Renderer) {
                super(renderer);

                this.shaderGenerator = new SmoothShaderGenerator(vertex, fragment);
                this.geometryClass = geometryClass;
                this.vertexSize = vertexSize;
            }
        };
    }
}

export const SmoothRenderer = SmoothRendererFactory.create();
