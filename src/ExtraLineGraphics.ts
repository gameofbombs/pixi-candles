namespace pixi_candles {
    const _vertex = (webgl1: boolean) => `#version ${webgl1 ? "100" : "300 es"}
precision highp float;

${webgl1 ? "attribute" : "in"} vec4 aAnchor;
${webgl1 ? "attribute" : "in"} float aSide;
${webgl1 ? "attribute" : "in"} float aStroke;
${webgl1 ? "attribute" : "in"} vec4 aColor;


uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform mat3 uTextureMatrix;
uniform float uDepth;

uniform highp float uStroke;
uniform highp float uCap;

${[
        "vec2 vPos",
        "vec4 vColor",
        "vec4 vDa",
        "float vStroke",
        "vec4 vA",
        "vec2 vD",
        "vec2 vS"
    ]
        .map((e) => (webgl1 ? "varying " : "out ") + e + ";")
        .join("\n")}

void main(void)
{
    vec2 side = vec2(
        -2.0 * (0.5 - mod(aSide, 2.)),
        -2.0 * (0.5 - step(1.5, aSide))
    );

    vD = aAnchor.zw - aAnchor.xy;
    vec2 nn = normalize (vD);
    vec2 tt = vec2(-nn.y, nn.x);

    vec2 main = aAnchor.xy;

    if(side.x > 0.) {
        main = aAnchor.zw;
    }

    vS = side;

    float cap = uCap;

    if(cap > 1.) {
        cap -=1.;
    }

    vec2 t = side.x * nn * cap + side.y * tt;
    vec2 pos = main + t * uStroke * aStroke;

    vPos = pos;
    vA = aAnchor;
    vDa = vec4(aAnchor.xy - pos, pos - aAnchor.zw);
    vColor = aColor;
    vStroke = uStroke * aStroke;

    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos, 1.0)).xy, uDepth, 1.);
}
`;

    const _frag = (webgl1: boolean, msaaEdge = false) => `#version ${
        webgl1 ? "100" : "300 es"
    }
${webgl1 ? `#extension GL_OES_standard_derivatives : enable` : ""}
precision highp float;

uniform vec4 uColor;
uniform sampler2D uSampler;

uniform highp float uCap;
uniform highp float uDiscard;

${[
        "vec2 vPos",
        "vec4 vColor",
        "float vStroke",
        "vec4 vDa",
        "vec4 vA",
        "vec2 vD",
        "vec2 vS"
    ]
        .map((e) => (webgl1 ? "varying " : "in ") + e + ";")
        .join("\n")}

${
        webgl1
            ? ""
            : `
layout(location = 0) out vec4 out_FragColor;
`
    }

float calcRound(vec2 v, vec2 da, float s) {
    float l = length(da);
    float d = dot(vD, da);

    return smoothstep(
        vStroke - s * 0.5,
        vStroke +  s * 0.5, l) * step(1., d);
}

void main(void)
{
    float alpha = 1.;
    vec4  c = uColor * vColor;//vec4(0.5 * (1. + vS), 0., 1.);

${
        webgl1
            ? `
    float vsD = 0.001;
    #ifdef  GL_OES_standard_derivatives
        vsD = fwidth(vS.g);
    #endif`
            : `
    float vsD = fwidth(vS.g);
    `
    }
    if(uCap > 1.){

${
        webgl1
            ? `
        float step = 0.05;
        #ifdef  GL_OES_standard_derivatives
            step = length(fwidth(gl_FragCoord.xy)) * 1.0;
        #endif
        `
            : `
        float step = length(fwidth(gl_FragCoord.xy)) * 1.0;
        `
    }
        float r1 = calcRound(vPos, vDa.xy + vsD, step);
        float r2 = calcRound(vPos, vDa.zw + vsD, step);

        alpha = 1. - (r1 + r2);
    }

    ${msaaEdge ? `alpha *= 1. - smoothstep(1. - vsD, 1., abs(vS.g));` : ""}

    if(alpha < 1. && uDiscard > 0.0)
       discard;

    ${webgl1 ? "gl_FragColor" : "out_FragColor"} = c * alpha;
}
`;

    export class LineMesh extends PIXI.Mesh {
        shaderApplied: boolean = false;
        needApplyAlpha: boolean = false;

        constructor(g: PIXI.Geometry) {
            super(
                g,
                new PIXI.MeshMaterial(PIXI.Texture.WHITE, {
                    uniforms: {
                        uStroke: 1,
                        uDiscard: 0,
                        uDepth: 0,
                        uCap: 2 // 0 - none, 1 - square, 2 - round
                    }
                })
            );

            this.shaderApplied = false;
        }

        buildShader(r: PIXI.Renderer) {
            if (!this.shaderApplied) {
                const webgl = r.gl instanceof WebGLRenderingContext;

                if (webgl) {
                    r.gl.getExtension("OES_standard_derivatives");
                }

                this.shader.program = PIXI.Program.from(
                    _vertex(webgl),
                    _frag(webgl, !r.gl.getContextAttributes()!!.antialias),
                    "LineShader"
                );
                (this.shader as any).batchable = false;

                this.shaderApplied = true;
                r.on("postrender", () => this.resetDepth(r));
            }
        }

        resetDepth(r: PIXI.Renderer) {
            //@ts-ignore
            r.depth = 0;
        }

        render(renderer: PIXI.Renderer) {
            this.buildShader(renderer);
            super.render(renderer);
        }

        _renderDefault(renderer: PIXI.Renderer) {
            const needCombine = this.alpha < 1 || this.needApplyAlpha;
            const gl = renderer.gl;

            if (needCombine) {
                //@ts-ignore
                if (!renderer.depth) {
                    //@ts-ignore
                    renderer.depth = 1;
                }

                //@ts-ignore
                const depth = renderer.depth++ / 1000;
                renderer.batch.flush();

                gl.depthFunc(gl.NOTEQUAL);
                gl.enable(gl.DEPTH_TEST);

                this.shader.uniforms.uDiscard = 1;
                this.shader.uniforms.uDepth = depth;

                super._renderDefault(renderer);

                this.shader.uniforms.uDiscard = 0;
            }

            super._renderDefault(renderer);

            if (needCombine) {
                gl.disable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }
        }
    }

    function buildLineBuffer(
        data: PIXI.GraphicsData,
        input: {
            anchors: number[];
            indices: number[];
            stokes: number[];
            side: number[];
            colors: number[];
        }
    ) {
        const points = data.points;
        const segs = points.length - 2;

        if (segs < 2) {
            return undefined;
        }

        const anchors = input.anchors;
        const index = input.indices;
        const ids = input.side;
        const colors = input.colors;
        const strokes = input.stokes;
        const offset = ids.length;

        const color = PIXI.utils.hex2rgb(data.lineStyle.color, []) as number[];

        const len = segs / 2;
        for (let i = 0; i < len + 1; i++) {
            const o = (i % len) * 2;

            for (let m = 0; m < 4; m++) {
                anchors.push(points[o], points[o + 1], points[o + 2], points[o + 3]);
                strokes.push(data.lineStyle.width);
                colors.push(color[0], color[1], color[2], data.lineStyle.alpha);
            }

            const ofs = offset + (i % len) * 4;

            index.push(ofs + 0, ofs + 1, ofs + 2, ofs + 3, ofs + 2, ofs + 1);
            // id is looped
            ids.push(0, 1, 2, 3);
        }

        return input;
    }

    export class ExtraGraphicsGeometry extends PIXI.GraphicsGeometry {
        _isolatedLines: PIXI.GraphicsData[] = [];
        _meshGeom: PIXI.Geometry;
        needApplyAlpha: boolean = false;

        updateBatches(indeces32: boolean) {
            if (!(this.validateBatching as any)()) {
                return;
            }

            this._isolatedLines = this.graphicsData.filter((e) => e.lineStyle.visible);

            //
            this.graphicsData = this.graphicsData.filter((e) => {
                e.lineStyle.visible = false; // disable lines from render
                return e.fillStyle !== null;
            });

            super.updateBatches(indeces32);

            this.populateMeshGeometry();
        }

        populateMeshGeometry() {
            const input = {
                anchors: [] as Array<number>,
                indices: [] as Array<number>,
                stokes: [] as Array<number>,
                side: [] as Array<number>,
                colors: [] as Array<number>
            };

            let alpha = false;

            for (let d of this._isolatedLines) {
                buildLineBuffer(d, input);
                alpha = alpha || d.lineStyle.alpha < 1;
            }

            const g = new PIXI.Geometry();

            g.addAttribute("aAnchor", input.anchors, 4);
            g.addAttribute("aSide", input.side, 1);
            g.addAttribute("aStroke", input.stokes, 1);
            g.addAttribute("aColor", input.colors, 4, true);
            g.addIndex(input.indices);

            this.needApplyAlpha = alpha;

            this._meshGeom = g;
        }
    }

    export class ExtraLineGraphics extends PIXI.Graphics {
        _subMesh: LineMesh;

        constructor() {
            super(new ExtraGraphicsGeometry());
        }

        _render(r: PIXI.Renderer) {
            super._render(r);

            const g = this.geometry as ExtraGraphicsGeometry;
            if (g._meshGeom) {
                if (!this._subMesh) {
                    this._subMesh = new LineMesh(g._meshGeom);
                } else {
                    //@ts-ignore
                    this._subMesh.geometry = g._meshGeom;
                }

                this._subMesh.transform.worldTransform = this.transform.worldTransform;

                this._subMesh.needApplyAlpha = g.needApplyAlpha;
                this._subMesh.buildShader(r);
                this._subMesh._renderDefault(r);
            }
        }
    }
}
