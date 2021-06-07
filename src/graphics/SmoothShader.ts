import {AbstractBatchRenderer, BatchShaderGenerator} from "@pixi/core";

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
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vSignedCoord.xy = aSignedCoord;
    vSignedCoord.zw = aSignedCoord.zw;
    vTextureId = aTextureId;
    vColor = aColor * tint;
}`;

export class SmoothShaderGenerator extends BatchShaderGenerator {

}

export class SmoothBatchRenderer extends AbstractBatchRenderer {

}
