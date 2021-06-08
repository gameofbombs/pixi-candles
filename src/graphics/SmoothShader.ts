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

void main(void){
    vec2 pointA = (translationMatrix * vec3(aPoint1, 1.0)).xy;
    vec2 pointB = (translationMatrix * vec3(aPoint2, 1.0)).xy;

    vec2 xBasis = pointB - pointA;
    vec2 norm = normalize(vec2(-xBasis.y, xBasis.x));

    //+ 0.00001 * (aNext - aPrev)

    float type = floor(aVertexJoint / 16.0);
    float vertexNum = aVertexJoint - type * 16.0;
    float dx = 0.0, dy = 1.0;

    vec2 pos;
    if (type == 0.0) {
        pos = pointA;
    } else {
        vec2 prev = (translationMatrix * vec3(aPrev, 1.0)).xy;
        vec2 next = (translationMatrix * vec3(aNext, 1.0)).xy;

        float dy = aLineStyle;
        if (vertexNum >= 1.5) {
            dy = -aLineStyle;
        }
        vec2 base, bisect, norm2;
        if (vertexNum < 0.5 || vertexNum > 2.5) {
            vec2 prev = (translationMatrix * vec3(aPrev, 1.0)).xy;
            base = pointA;
            norm2 = normalize(vec2(aPrev.y - pointA.y, pointA.x - aPrev.x));
        } else {
            vec2 next = (translationMatrix * vec3(aNext, 1.0)).xy;
            base = pointB;
            norm2 = normalize(vec2(pointB.y - next.y, next.x - pointB.x));
        }
        if (dot(norm, norm2) > -0.001) {
            vec2 bisect = (norm + norm2) / 2.0;
            bisect /= dot(norm, bisect);

            pos = base + dy * bisect;
        } else {
            pos = base + dy * norm;
        }
    }

    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);

    vColor = aColor * tint;
}`;

const frag = `
varying vec4 vColor;

//%forloop% %count%

void main(void){
    gl_FragColor = vColor;
}
`;

export class SmoothShaderGenerator extends BatchShaderGenerator {
    generateShader(maxTextures: number): Shader
    {
        if (!this.programCache[maxTextures])
        {
            this.programCache[maxTextures] = new Program(this.vertexSrc, this.fragTemplate);
        }

        const uniforms = {
            tint: new Float32Array([1, 1, 1, 1]),
            translationMatrix: new Matrix(),
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
