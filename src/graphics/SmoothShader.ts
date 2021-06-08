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

    vec2 xBasis = pointB - pointA + 0.00001 * (aNext - aPrev);
    vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x));

    float type = floor(aVertexJoint / 8.0);
    float vertexNum = aVertexJoint - type * 8.0;
    float dx = 0.0, dy = 1.0;

    vec2 pos;
    if (type == 0.0) {
        pos = pointA;
    } else {
        if (vertexNum == 1.0) {
            dx = 1.0;
        } else if (vertexNum == 2.0) {
            dx = 1.0;
            dy = -1.0;
        } else if (vertexNum == 3.0) {
            dy = -1.0;
        }
        pos = pointA + xBasis * dx + yBasis * dy * aLineStyle;
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
