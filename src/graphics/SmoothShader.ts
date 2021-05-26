import {AbstractBatchRenderer, BatchShaderGenerator} from "@pixi/core";

const vert = `precision highp float;
attribute vec2 aVertexPosition;
attribute vec2 aBisector;
attribute vec2 aNormal;
attribute vec2 aWidths;
attribute float side;
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
