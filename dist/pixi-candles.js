var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var pixi_candles;
(function (pixi_candles) {
    var barVert = "\nattribute vec4 aRect;\nattribute vec2 aQuad;\nattribute vec4 aColor;\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\nuniform float resolution;\nuniform vec4 uColor;\n\nvarying vec4 vPixelPos;\nvarying vec4 vPixelRect;\nvarying vec4 vColor;\n\nvoid main(void){\n    vec2 p1 = (translationMatrix * vec3(aRect.xy, 1.0)).xy;\n    vec2 p2 = (translationMatrix * vec3(aRect.xy + aRect.zw, 1.0)).xy;\n\n    vec2 leftTop = p1;\n    vec2 rightBottom = p2;\n    vec2 sign = aQuad;\n\n    // handle negative width/height, or translationMatrix .a .d < 0\n    if (p1.x > p2.x) {\n        sign.x = 1.0 - aQuad.x;\n        leftTop.x = p2.x;\n        rightBottom.x = p1.x;\n    }\n    if (p1.y > p2.y) {\n        sign.y = 1.0 - aQuad.y;\n        leftTop.y = p2.y;\n        rightBottom.y = p1.y;\n    }\n\n    vPixelRect = vec4(leftTop * resolution, rightBottom * resolution);\n\n    vec2 pos = (translationMatrix * vec3(aRect.xy + aRect.zw * aQuad, 1.0)).xy;\n    pos = floor(pos * resolution + 0.01 + sign * 0.98);\n    vPixelPos = vec4(pos - 0.5, pos + 0.5);\n    gl_Position = vec4((projectionMatrix * vec3(pos / resolution, 1.0)).xy, 0.0, 1.0);\n\n    vColor = aColor * uColor;\n}";
    var barFrag = "\nvarying vec4 vPixelPos;\nvarying vec4 vPixelRect;\nvarying vec4 vColor;\n\nvoid main(void) {\n    vec2 leftTop = max(vPixelPos.xy, vPixelRect.xy);\n    vec2 rightBottom = min(vPixelPos.zw, vPixelRect.zw);\n    vec2 area = max(rightBottom - leftTop, 0.0);\n    float clip = area.x * area.y;\n\n    gl_FragColor = vColor * clip;\n}";
    var BarsShader = (function (_super) {
        __extends(BarsShader, _super);
        function BarsShader() {
            return _super.call(this, PIXI.Texture.WHITE, {
                uniforms: {
                    resolution: 1
                },
                program: BarsShader.getProgram()
            }) || this;
        }
        BarsShader.getProgram = function () {
            if (!BarsShader._prog) {
                BarsShader._prog = new PIXI.Program(barVert, barFrag);
            }
            return BarsShader._prog;
        };
        BarsShader._prog = null;
        return BarsShader;
    }(PIXI.MeshMaterial));
    pixi_candles.BarsShader = BarsShader;
    var TYPES = PIXI.TYPES;
    var BarsGeometry = (function (_super) {
        __extends(BarsGeometry, _super);
        function BarsGeometry(_static) {
            if (_static === void 0) { _static = false; }
            var _this = _super.call(this) || this;
            _this.lastLen = 0;
            _this.lastPointNum = 0;
            _this.lastPointData = 0;
            _this.points = [];
            _this._floatView = null;
            _this._u32View = null;
            _this._buffer = null;
            _this._quad = null;
            _this._indexBuffer = null;
            _this.stridePoints = 5;
            _this.strideFloats = 5;
            _this.strideBytes = 20;
            _this.legacyGeom = null;
            _this.legacyBuffer = null;
            _this.initGeom(_static);
            _this.reset();
            return _this;
        }
        BarsGeometry.prototype.initGeom = function (_static) {
            this._buffer = new PIXI.Buffer(new Float32Array(0), _static, false);
            this._quad = new PIXI.Buffer(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), true, false);
            this._indexBuffer = new PIXI.Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), true, true);
            this.addAttribute('aRect', this._buffer, 4, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aColor', this._buffer, 4, true, TYPES.UNSIGNED_BYTE, undefined, undefined, true)
                .addAttribute('aQuad', this._quad, 2, false, TYPES.FLOAT)
                .addIndex(this._indexBuffer);
        };
        BarsGeometry.prototype.addRect = function (x, y, w, h, color) {
            var points = this.points;
            points.push(x);
            points.push(y);
            points.push(w);
            points.push(h);
            points.push(color);
        };
        BarsGeometry.prototype.invalidate = function (pointNum) {
            if (pointNum === void 0) { pointNum = 0; }
            this.lastPointNum = Math.min(pointNum, this.lastPointNum);
        };
        BarsGeometry.prototype.reset = function () {
            if (this.lastLen > 0) {
                this.clearBufferData();
            }
            this.lastLen = 0;
            this.lastPointData = 0;
            this.points.length = 0;
            this.instanceCount = 0;
        };
        BarsGeometry.prototype.clearBufferData = function () {
            var _a = this, points = _a.points, strideBytes = _a.strideBytes, stridePoints = _a.stridePoints;
            this.lastPointNum = 0;
            this.lastPointData = 0;
            var arrBuf = new ArrayBuffer(strideBytes * points.length / stridePoints);
            this.lastLen = points.length;
            this._floatView = new Float32Array(arrBuf);
            this._u32View = new Uint32Array(arrBuf);
            this._buffer.update(arrBuf);
        };
        BarsGeometry.prototype.updateBuffer = function () {
            var _a = this, points = _a.points, stridePoints = _a.stridePoints, strideFloats = _a.strideFloats;
            if (this.lastLen > points.length) {
                this.lastLen = -1;
            }
            if (this.lastLen < points.length
                || this.lastPointNum < this.lastLen) {
                this.clearBufferData();
            }
            if (this.lastPointNum == this.lastLen) {
                return;
            }
            var _b = this, _floatView = _b._floatView, _u32View = _b._u32View;
            this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
            var j = Math.round(this.lastPointNum * strideFloats / stridePoints);
            for (var i = this.lastPointNum; i < points.length; i += stridePoints) {
                _floatView[j++] = points[i];
                _floatView[j++] = points[i + 1];
                _floatView[j++] = points[i + 2];
                _floatView[j++] = points[i + 3];
                var rgb = points[i + 4];
                var bgra = ((rgb >> 16) & 0xff) | (rgb & 0xff00) | ((rgb & 0xff) << 16) | (255 << 24);
                _u32View[j++] = bgra;
            }
            this._buffer.update();
            this.instanceCount = Math.round(points.length / stridePoints);
            this.lastPointNum = this.lastLen;
            this.lastPointData = this.lastLen;
            if (this.legacyGeom) {
                this.updateLegacy();
            }
        };
        BarsGeometry.prototype.initLegacy = function () {
            if (this.legacyGeom) {
                return;
            }
            this.legacyGeom = new PIXI.Geometry();
            this.legacyBuffer = new PIXI.Buffer(new Float32Array(0), false, false);
            this.legacyGeom.addAttribute('aRect', this.legacyBuffer, 4, false, TYPES.FLOAT)
                .addAttribute('aColor', this.legacyBuffer, 4, true, TYPES.UNSIGNED_BYTE)
                .addAttribute('aQuad', this.legacyBuffer, 2, false, TYPES.FLOAT)
                .addIndex(new PIXI.Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), false, true));
        };
        BarsGeometry.prototype.updateLegacy = function () {
            var _a = this, legacyBuffer = _a.legacyBuffer, _floatView = _a._floatView, _u32View = _a._u32View, strideFloats = _a.strideFloats;
            var strideLegacy = 7;
            var quadsCount = this._floatView.length / strideFloats;
            var legacyLen = quadsCount * strideLegacy * 4;
            if (legacyBuffer.data.length !== legacyLen) {
                legacyBuffer.data = new Float32Array(legacyLen);
                this.legacyGeom.getIndex().update(PIXI.utils.createIndicesForQuads(quadsCount));
            }
            var floats = legacyBuffer.data;
            var quad = this._quad.data;
            for (var i = 0, j = 0; i < this._floatView.length;) {
                for (var k = 0; k < 4; k++) {
                    floats[j++] = _floatView[i];
                    floats[j++] = _floatView[i + 1];
                    floats[j++] = _floatView[i + 2];
                    floats[j++] = _floatView[i + 3];
                    floats[j++] = _floatView[i + 4];
                    floats[j++] = quad[k * 2];
                    floats[j++] = quad[k * 2 + 1];
                }
                i += strideFloats;
            }
            legacyBuffer.update();
        };
        return BarsGeometry;
    }(PIXI.Geometry));
    pixi_candles.BarsGeometry = BarsGeometry;
    var Bars = (function (_super) {
        __extends(Bars, _super);
        function Bars() {
            return _super.call(this, new BarsGeometry(), new BarsShader()) || this;
        }
        Bars.prototype.addRect = function (x, y, w, h, color) {
            var geometry = this.geometry;
            geometry.addRect(x, y, w, h, color);
        };
        Bars.prototype.clear = function () {
            this.geometry.reset();
        };
        Bars.prototype._renderDefault = function (renderer) {
            var geometry = this.geometry;
            var useLegacy = !renderer.geometry.hasInstance;
            if (useLegacy) {
                geometry.initLegacy();
            }
            geometry.updateBuffer();
            if (geometry.instanceCount === 0) {
                return;
            }
            var rt = renderer.renderTexture.current;
            this.shader.uniforms.resolution = rt ? rt.baseTexture.resolution : renderer.resolution;
            if (useLegacy) {
                this.geometry = geometry.legacyGeom;
                _super.prototype._renderDefault.call(this, renderer);
                this.geometry = geometry;
                return;
            }
            _super.prototype._renderDefault.call(this, renderer);
        };
        Bars.prototype._renderCanvas = function (renderer) {
            var points = this.geometry.points;
            var context = renderer.context;
            renderer.setContextTransform(this.transform.worldTransform);
            context.beginPath();
            var clr = -1;
            for (var i = 0; i < points.length; i += 5) {
                if (clr !== points[i + 4]) {
                    clr = points[i + 4];
                    var fill = PIXI.utils.hex2string(clr);
                    context.fillStyle = fill;
                }
                context.beginPath();
                context.rect(points[i], points[i + 1], points[i + 2], points[i + 3]);
                context.fill();
            }
            context.beginPath();
        };
        return Bars;
    }(PIXI.Mesh));
    pixi_candles.Bars = Bars;
})(pixi_candles || (pixi_candles = {}));
var pixi_candles;
(function (pixi_candles) {
    var _vertex = function (webgl1) { return "#version " + (webgl1 ? "100" : "300 es") + "\nprecision highp float;\n\n" + (webgl1 ? "attribute" : "in") + " vec4 aAnchor;\n" + (webgl1 ? "attribute" : "in") + " float aSide;\n" + (webgl1 ? "attribute" : "in") + " float aStroke;\n" + (webgl1 ? "attribute" : "in") + " vec4 aColor;\n\n\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\nuniform mat3 uTextureMatrix;\nuniform float uDepth;\n\nuniform highp float uStroke;\nuniform highp float uCap;\n\n" + [
        "vec2 vPos",
        "vec4 vColor",
        "vec4 vDa",
        "float vStroke",
        "vec4 vA",
        "vec2 vD",
        "vec2 vS"
    ]
        .map(function (e) { return (webgl1 ? "varying " : "out ") + e + ";"; })
        .join("\n") + "\n\nvoid main(void)\n{\n    vec2 side = vec2(\n        -2.0 * (0.5 - mod(aSide, 2.)),\n        -2.0 * (0.5 - step(1.5, aSide))\n    );\n\n    vD = aAnchor.zw - aAnchor.xy;\n    vec2 nn = normalize (vD);\n    vec2 tt = vec2(-nn.y, nn.x);\n\n    vec2 main = aAnchor.xy;\n\n    if(side.x > 0.) {\n        main = aAnchor.zw;\n    }\n\n    vS = side;\n\n    float cap = uCap;\n\n    if(cap > 1.) {\n        cap -=1.;\n    }\n\n    vec2 t = side.x * nn * cap + side.y * tt;\n    vec2 pos = main + t * uStroke * aStroke;\n\n    vPos = pos;\n    vA = aAnchor;\n    vDa = vec4(aAnchor.xy - pos, pos - aAnchor.zw);\n    vColor = aColor;\n    vStroke = uStroke * aStroke;\n\n    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos, 1.0)).xy, uDepth, 1.);\n}\n"; };
    var _frag = function (webgl1, msaaEdge) {
        if (msaaEdge === void 0) { msaaEdge = false; }
        return "#version " + (webgl1 ? "100" : "300 es") + "\n" + (webgl1 ? "#extension GL_OES_standard_derivatives : enable" : "") + "\nprecision highp float;\n\nuniform vec4 uColor;\nuniform sampler2D uSampler;\n\nuniform highp float uCap;\nuniform highp float uDiscard;\n\n" + [
            "vec2 vPos",
            "vec4 vColor",
            "float vStroke",
            "vec4 vDa",
            "vec4 vA",
            "vec2 vD",
            "vec2 vS"
        ]
            .map(function (e) { return (webgl1 ? "varying " : "in ") + e + ";"; })
            .join("\n") + "\n\n" + (webgl1
            ? ""
            : "\nlayout(location = 0) out vec4 out_FragColor;\n") + "\n\nfloat calcRound(vec2 v, vec2 da, float s) {\n    float l = length(da);\n    float d = dot(vD, da);\n\n    return smoothstep(\n        vStroke - s * 0.5,\n        vStroke +  s * 0.5, l) * step(1., d);\n}\n\nvoid main(void)\n{\n    float alpha = 1.;\n    vec4  c = uColor * vColor;//vec4(0.5 * (1. + vS), 0., 1.);\n\n" + (webgl1
            ? "\n    float vsD = 0.001;\n    #ifdef  GL_OES_standard_derivatives\n        vsD = fwidth(vS.g);\n    #endif"
            : "\n    float vsD = fwidth(vS.g);\n    ") + "\n    if(uCap > 1.){\n\n" + (webgl1
            ? "\n        float step = 0.05;\n        #ifdef  GL_OES_standard_derivatives\n            step = length(fwidth(gl_FragCoord.xy)) * 1.0;\n        #endif\n        "
            : "\n        float step = length(fwidth(gl_FragCoord.xy)) * 1.0;\n        ") + "\n        float r1 = calcRound(vPos, vDa.xy + vsD, step);\n        float r2 = calcRound(vPos, vDa.zw + vsD, step);\n\n        alpha = 1. - (r1 + r2);\n    }\n\n    " + (msaaEdge ? "alpha *= 1. - smoothstep(1. - vsD, 1., abs(vS.g));" : "") + "\n\n    if(alpha < 1. && uDiscard > 0.0)\n       discard;\n\n    " + (webgl1 ? "gl_FragColor" : "out_FragColor") + " = c * alpha;\n}\n";
    };
    var LineMesh = (function (_super) {
        __extends(LineMesh, _super);
        function LineMesh(g) {
            var _this = _super.call(this, g, new PIXI.MeshMaterial(PIXI.Texture.WHITE, {
                uniforms: {
                    uStroke: 1,
                    uDiscard: 0,
                    uDepth: 0,
                    uCap: 2
                }
            })) || this;
            _this.shaderApplied = false;
            _this.needApplyAlpha = false;
            _this.shaderApplied = false;
            return _this;
        }
        LineMesh.prototype.buildShader = function (r) {
            var _this = this;
            if (!this.shaderApplied) {
                var webgl = r.gl instanceof WebGLRenderingContext;
                if (webgl) {
                    r.gl.getExtension("OES_standard_derivatives");
                }
                this.shader.program = PIXI.Program.from(_vertex(webgl), _frag(webgl, !r.gl.getContextAttributes().antialias), "LineShader");
                this.shader.batchable = false;
                this.shaderApplied = true;
                r.on("postrender", function () { return _this.resetDepth(r); });
            }
        };
        LineMesh.prototype.resetDepth = function (r) {
            r.depth = 0;
        };
        LineMesh.prototype.render = function (renderer) {
            this.buildShader(renderer);
            _super.prototype.render.call(this, renderer);
        };
        LineMesh.prototype._renderDefault = function (renderer) {
            var needCombine = this.alpha < 1 || this.needApplyAlpha;
            var gl = renderer.gl;
            if (needCombine) {
                if (!renderer.depth) {
                    renderer.depth = 1;
                }
                var depth = renderer.depth++ / 1000;
                renderer.batch.flush();
                gl.depthFunc(gl.NOTEQUAL);
                gl.enable(gl.DEPTH_TEST);
                this.shader.uniforms.uDiscard = 1;
                this.shader.uniforms.uDepth = depth;
                _super.prototype._renderDefault.call(this, renderer);
                this.shader.uniforms.uDiscard = 0;
            }
            _super.prototype._renderDefault.call(this, renderer);
            if (needCombine) {
                gl.disable(gl.DEPTH_TEST);
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }
        };
        return LineMesh;
    }(PIXI.Mesh));
    pixi_candles.LineMesh = LineMesh;
    function buildLineBuffer(data, input) {
        var points = data.points;
        var segs = points.length - 2;
        if (segs < 2) {
            return undefined;
        }
        var anchors = input.anchors;
        var index = input.indices;
        var ids = input.side;
        var colors = input.colors;
        var strokes = input.stokes;
        var offset = ids.length;
        var color = PIXI.utils.hex2rgb(data.lineStyle.color, []);
        var len = segs / 2;
        for (var i = 0; i < len + 1; i++) {
            var o = (i % len) * 2;
            for (var m = 0; m < 4; m++) {
                anchors.push(points[o], points[o + 1], points[o + 2], points[o + 3]);
                strokes.push(data.lineStyle.width);
                colors.push(color[0], color[1], color[2], data.lineStyle.alpha);
            }
            var ofs = offset + (i % len) * 4;
            index.push(ofs + 0, ofs + 1, ofs + 2, ofs + 3, ofs + 2, ofs + 1);
            ids.push(0, 1, 2, 3);
        }
        return input;
    }
    var ExtraGraphicsGeometry = (function (_super) {
        __extends(ExtraGraphicsGeometry, _super);
        function ExtraGraphicsGeometry() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._isolatedLines = [];
            _this.needApplyAlpha = false;
            return _this;
        }
        ExtraGraphicsGeometry.prototype.updateBatches = function (indeces32) {
            if (!this.validateBatching()) {
                return;
            }
            this._isolatedLines = this.graphicsData.filter(function (e) { return e.lineStyle.visible; });
            this.graphicsData = this.graphicsData.filter(function (e) {
                e.lineStyle.visible = false;
                return e.fillStyle !== null;
            });
            _super.prototype.updateBatches.call(this, indeces32);
            this.populateMeshGeometry();
        };
        ExtraGraphicsGeometry.prototype.populateMeshGeometry = function () {
            var input = {
                anchors: [],
                indices: [],
                stokes: [],
                side: [],
                colors: []
            };
            var alpha = false;
            for (var _i = 0, _a = this._isolatedLines; _i < _a.length; _i++) {
                var d = _a[_i];
                buildLineBuffer(d, input);
                alpha = alpha || d.lineStyle.alpha < 1;
            }
            var g = new PIXI.Geometry();
            g.addAttribute("aAnchor", input.anchors, 4);
            g.addAttribute("aSide", input.side, 1);
            g.addAttribute("aStroke", input.stokes, 1);
            g.addAttribute("aColor", input.colors, 4, true);
            g.addIndex(input.indices);
            this.needApplyAlpha = alpha;
            this._meshGeom = g;
        };
        return ExtraGraphicsGeometry;
    }(PIXI.GraphicsGeometry));
    pixi_candles.ExtraGraphicsGeometry = ExtraGraphicsGeometry;
    var ExtraLineGraphics = (function (_super) {
        __extends(ExtraLineGraphics, _super);
        function ExtraLineGraphics() {
            return _super.call(this, new ExtraGraphicsGeometry()) || this;
        }
        ExtraLineGraphics.prototype._render = function (r) {
            _super.prototype._render.call(this, r);
            var g = this.geometry;
            if (g._meshGeom) {
                if (!this._subMesh) {
                    this._subMesh = new LineMesh(g._meshGeom);
                }
                else {
                    this._subMesh.geometry = g._meshGeom;
                }
                this._subMesh.transform.worldTransform = this.transform.worldTransform;
                this._subMesh.needApplyAlpha = g.needApplyAlpha;
                this._subMesh.buildShader(r);
                this._subMesh._renderDefault(r);
            }
        };
        return ExtraLineGraphics;
    }(PIXI.Graphics));
    pixi_candles.ExtraLineGraphics = ExtraLineGraphics;
})(pixi_candles || (pixi_candles = {}));
var pixi_candles;
(function (pixi_candles) {
    var plotVert = "\nattribute vec2 aPoint0;\nattribute vec2 aPoint1;\nattribute vec2 aSides;\nattribute vec2 aQuad;\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\nuniform float resolution;\nuniform vec2 lineWidth;\nuniform float miterLimit;\n\nvarying vec3 line;\nvarying vec3 lineLeft;\nvarying vec3 lineRight;\nvarying vec4 vPixelPos;\n\nconst float eps = 0.001;\n\nvoid main(void) {\n    float lenX = length(translationMatrix * vec3(1.0, 0.0, 0.0));\n    float w = (lineWidth.x * lenX + lineWidth.y) * 0.5 * resolution;\n\n    vec2 p0 = (translationMatrix * vec3(aPoint0, 1.0)).xy;\n    vec2 p1 = (translationMatrix * vec3(aPoint1, 1.0)).xy;\n\n    p0 *= resolution;\n    p1 *= resolution;\n\n    vec2 k0 = (translationMatrix * vec3(1.0, aSides[0], 0.0)).xy;\n    vec2 k1 = (translationMatrix * vec3(1.0, aSides[1], 0.0)).xy;\n\n    if (p0.x > p1.x) {\n        // make everything positive\n        vec2 tmp = p0;\n        p0 = p1;\n        p1 = tmp;\n        tmp = k0;\n        k0 = k1;\n        k1 = tmp;\n    }\n\n    line.x = (p1.y - p0.y) / (p1.x - p0.x);\n    line.y = p0.y - line.x * p0.x;\n    line.z = w * sqrt(line.x * line.x + 1.0);\n\n    lineLeft.x = k0.y / k0.x;\n    lineLeft.y = p0.y - lineLeft.x * p0.x;\n    lineLeft.z = w * sqrt(lineLeft.x * lineLeft.x + 1.0);\n\n    lineRight.x = k1.y / k1.x;\n    lineRight.y = p1.y - lineRight.x * p1.x;\n    lineRight.z = w * sqrt(lineRight.x * lineRight.x + 1.0);\n\n    // calculating quad\n    vec2 pos = vec2(0.0);\n\n    vec2 sign = aQuad;\n    // strange rounding\n    if (abs(line.x) < 10.0 && p1.x - p0.x > 3.0) {\n        sign.x = 0.5;\n    }\n\n    float H = 0.0;\n    if (aQuad.x < 0.5) {\n        H = min(miterLimit * line.z, max(lineLeft.z, line.z));\n        pos = p0;\n    } else {\n        H = min(miterLimit * line.z, max(lineRight.z, line.z));\n        pos = p1;\n    }\n    H += 2.0;\n    pos.y += H * (aQuad.y * 2.0 - 1.0);\n\n    pos.y -= (pos.x - floor(pos.x + eps + sign.x)) * line.x;\n    pos = floor(pos + eps + sign * (1.0 - 2.0 * eps));\n    vPixelPos = vec4(pos - 0.5, pos + 0.5);\n    gl_Position = vec4((projectionMatrix * vec3(pos / resolution, 1.0)).xy, 0.0, 1.0);\n}";
    var plotFrag = "\nvarying vec3 line;\nvarying vec3 lineLeft;\nvarying vec3 lineRight;\nvarying vec4 vPixelPos;\nuniform vec4 uColor;\nuniform vec4 uGeomColor;\n\nfloat cut(float x, float y1, float y2) {\n    vec2 range = vec2(dot(line, vec3(x, 1.0, -1.0)), dot(line, vec3(x, 1.0, 1.0)));\n    if (line.x + lineLeft.x > 0.0) {\n        float v = dot(lineLeft, vec3(x, 1.0, -1.0));\n        if (line.x < lineLeft.x) {\n            range.x = min(range.x, v);\n        } else {\n            range.x = max(range.x, v);\n        }\n    } else {\n        float v = dot(lineLeft, vec3(x, 1.0, 1.0));\n        if (line.x < lineLeft.x) {\n            range.y = min(range.y, v);\n        } else {\n            range.y = max(range.y, v);\n        }\n    }\n\n    if (line.x + lineRight.x < 0.0) {\n        float v = dot(lineRight, vec3(x, 1.0, -1.0));\n        if (line.x > lineRight.x) {\n            range.x = min(range.x, v);\n        } else {\n            range.x = max(range.x, v);\n        }\n    } else {\n        float v = dot(lineRight, vec3(x, 1.0, 1.0));\n        if (line.x > lineRight.x) {\n            range.y = min(range.y, v);\n        } else {\n            range.y = max(range.y, v);\n        }\n    }\n\n    range.x = max(range.x, y1);\n    range.y = min(range.y, y2);\n    return max(range.y - range.x, 0.0);\n}\n\nconst float N = 8.0;\nconst float step = 1.0 / N;\nconst float div = 1.0 / (N + 1.0);\n\nvoid main(void) {\n    // float cutLeft = cut(vPixelPos.x, vPixelPos.y, vPixelPos.w);\n    // float cutRight = cut(vPixelPos.z, vPixelPos.y, vPixelPos.w);\n    // float clip = (cutLeft + cutRight) / 2.0;\n\n    float d = (vPixelPos.z - vPixelPos.x);\n    float clip = 0.0;\n    for (float i = 0.0; i < N; i += 1.) {\n        clip += cut(vPixelPos.x + d * i * step, vPixelPos.y, vPixelPos.w);\n    }\n    clip *= div;\n\n    gl_FragColor = uColor * clip + uGeomColor * (1.0 - clip);\n}";
    var PlotShader = (function (_super) {
        __extends(PlotShader, _super);
        function PlotShader() {
            return _super.call(this, PIXI.Texture.WHITE, {
                uniforms: {
                    resolution: 1,
                    lineWidth: new Float32Array([1, 0]),
                    miterLimit: 5,
                    uGeomColor: new Float32Array([0, 0, 0, 0]),
                },
                program: PlotShader.getProgram()
            }) || this;
        }
        PlotShader.getProgram = function () {
            if (!PlotShader._prog) {
                PlotShader._prog = new PIXI.Program(plotVert, plotFrag);
            }
            return PlotShader._prog;
        };
        PlotShader._prog = null;
        return PlotShader;
    }(PIXI.MeshMaterial));
    pixi_candles.PlotShader = PlotShader;
    var TYPES = PIXI.TYPES;
    var PlotGeometry = (function (_super) {
        __extends(PlotGeometry, _super);
        function PlotGeometry(_static) {
            if (_static === void 0) { _static = false; }
            var _this = _super.call(this) || this;
            _this.jointStyle = PIXI.LINE_JOIN.BEVEL;
            _this.lastLen = 0;
            _this.lastPointNum = 0;
            _this.lastPointData = 0;
            _this.updateId = 0;
            _this.points = [];
            _this._floatView = null;
            _this._u32View = null;
            _this._buffer = null;
            _this._quad = null;
            _this._indexBuffer = null;
            _this.stridePoints = 2;
            _this.strideFloats = 6;
            _this.strideBytes = 24;
            _this.legacyGeom = null;
            _this.legacyBuffer = null;
            _this.initGeom(_static);
            _this.reset();
            return _this;
        }
        PlotGeometry.prototype.initGeom = function (_static) {
            this._buffer = new PIXI.Buffer(new Float32Array(0), _static, false);
            this._quad = new PIXI.Buffer(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), true, false);
            this._indexBuffer = new PIXI.Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), true, true);
            this.addAttribute('aPoint0', this._buffer, 2, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aPoint1', this._buffer, 2, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aSides', this._buffer, 2, false, TYPES.FLOAT, undefined, undefined, true)
                .addAttribute('aQuad', this._quad, 2, false, TYPES.FLOAT)
                .addIndex(this._indexBuffer);
        };
        PlotGeometry.prototype.moveTo = function (x, y) {
            var points = this.points;
            points.push(x);
            points.push(y);
        };
        PlotGeometry.prototype.lineTo = function (x, y) {
            var points = this.points;
            points.push(x);
            points.push(y);
        };
        PlotGeometry.prototype.lineBy = function (dx, dy) {
            var _a = this, points = _a.points, stridePoints = _a.stridePoints;
            var x = points[points.length - stridePoints];
            var y = points[points.length - stridePoints + 1];
            points.push(x + dx);
            points.push(y + dy);
        };
        PlotGeometry.prototype.invalidate = function (pointNum) {
            if (pointNum === void 0) { pointNum = 0; }
            this.lastPointNum = Math.min(pointNum, this.lastPointNum);
            this.updateId++;
        };
        PlotGeometry.prototype.reset = function () {
            if (this.lastLen > 0) {
                this.clearBufferData();
            }
            this.updateId++;
            this.lastLen = 0;
            this.lastPointData = 0;
            this.points.length = 0;
            this.instanceCount = 0;
        };
        PlotGeometry.prototype.clearBufferData = function () {
            var _a = this, points = _a.points, strideBytes = _a.strideBytes, stridePoints = _a.stridePoints;
            this.lastPointNum = 0;
            this.lastPointData = 0;
            var arrayLen = Math.max(0, points.length / stridePoints - 1);
            var arrBuf = new ArrayBuffer(strideBytes * arrayLen);
            this.lastLen = points.length;
            this._floatView = new Float32Array(arrBuf);
            this._u32View = new Uint32Array(arrBuf);
            this._buffer.update(arrBuf);
        };
        PlotGeometry.prototype.updateBuffer = function () {
            var _a = this, points = _a.points, stridePoints = _a.stridePoints, strideFloats = _a.strideFloats;
            if (this.lastLen > points.length) {
                this.lastLen = -1;
            }
            if (this.lastLen < points.length
                || this.lastPointNum < this.lastLen) {
                this.clearBufferData();
            }
            if (this.lastPointNum == this.lastLen) {
                return;
            }
            var _b = this, _floatView = _b._floatView, _u32View = _b._u32View;
            var bevel = this.jointStyle === PIXI.LINE_JOIN.BEVEL;
            this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
            var j = Math.round(this.lastPointNum * strideFloats / stridePoints);
            for (var i = this.lastPointNum; i < points.length - stridePoints; i += stridePoints) {
                var prev = i - stridePoints;
                var next = i + stridePoints;
                var next2 = i + stridePoints * 2;
                _floatView[j++] = points[i];
                _floatView[j++] = points[i + 1];
                _floatView[j++] = points[next];
                _floatView[j++] = points[next + 1];
                var dx = points[next] - points[i];
                var dy = points[next + 1] - points[i + 1];
                var D = Math.sqrt(dx * dx + dy * dy);
                var k = dy / dx;
                if (prev >= 0) {
                    var dx2 = points[i] - points[prev];
                    var dy2 = points[i + 1] - points[prev + 1];
                    if (bevel) {
                        var D2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                        _floatView[j++] = (dy2 * D + dy * D2) / (dx2 * D + dx * D2);
                    }
                    else {
                        _floatView[j++] = dy2 / dx2;
                    }
                }
                else {
                    _floatView[j++] = k;
                }
                if (next2 < points.length) {
                    var dx2 = points[next2] - points[next];
                    var dy2 = points[next2 + 1] - points[next + 1];
                    if (bevel) {
                        var D2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                        _floatView[j++] = (dy2 * D + dy * D2) / (dx2 * D + dx * D2);
                    }
                    else {
                        _floatView[j++] = dy2 / dx2;
                    }
                }
                else {
                    _floatView[j++] = k;
                }
            }
            this._buffer.update();
            this.instanceCount = Math.round(points.length / stridePoints - 1);
            this.lastPointNum = this.lastLen;
            this.lastPointData = this.lastLen;
            if (this.legacyGeom) {
                this.updateLegacy();
            }
        };
        PlotGeometry.prototype.initLegacy = function () {
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
        };
        PlotGeometry.prototype.updateLegacy = function () {
            var _a = this, legacyBuffer = _a.legacyBuffer, _floatView = _a._floatView, _u32View = _a._u32View, strideFloats = _a.strideFloats;
            var strideLegacy = 8;
            var quadsCount = this._floatView.length / strideFloats;
            var legacyLen = quadsCount * strideLegacy * 4;
            if (legacyBuffer.data.length !== legacyLen) {
                legacyBuffer.data = new Float32Array(legacyLen);
                this.legacyGeom.getIndex().update(PIXI.utils.createIndicesForQuads(quadsCount));
            }
            var floats = legacyBuffer.data;
            var quad = this._quad.data;
            for (var i = 0, j = 0; i < this._floatView.length;) {
                for (var k = 0; k < 4; k++) {
                    floats[j++] = _floatView[i];
                    floats[j++] = _floatView[i + 1];
                    floats[j++] = _floatView[i + 2];
                    floats[j++] = _floatView[i + 3];
                    floats[j++] = _floatView[i + 4];
                    floats[j++] = _floatView[i + 5];
                    floats[j++] = quad[k * 2];
                    floats[j++] = quad[k * 2 + 1];
                }
                i += strideFloats;
            }
        };
        return PlotGeometry;
    }(PIXI.Geometry));
    pixi_candles.PlotGeometry = PlotGeometry;
    var Plot = (function (_super) {
        __extends(Plot, _super);
        function Plot(options) {
            var _this = this;
            var geometry = new PlotGeometry();
            var shader = new PlotShader();
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
            _this = _super.call(this, geometry, shader) || this;
            return _this;
        }
        Plot.prototype.moveTo = function (x, y) {
            var geometry = this.geometry;
            geometry.moveTo(x, y);
        };
        Plot.prototype.lineTo = function (x, y) {
            var geometry = this.geometry;
            geometry.lineTo(x, y);
        };
        Plot.prototype.lineBy = function (x, y) {
            var geometry = this.geometry;
            geometry.lineBy(x, y);
        };
        Plot.prototype.lineStyle = function (width, nativeWidth, jointStyle) {
            var geometry = this.geometry;
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
        };
        Plot.prototype.clear = function () {
            this.geometry.reset();
        };
        Plot.prototype._renderDefault = function (renderer) {
            var geometry = this.geometry;
            var useLegacy = !renderer.geometry.hasInstance;
            if (useLegacy) {
                geometry.initLegacy();
            }
            geometry.updateBuffer();
            if (geometry.instanceCount === 0) {
                return;
            }
            var rt = renderer.renderTexture.current;
            this.shader.uniforms.resolution = rt ? rt.baseTexture.resolution : renderer.resolution;
            if (useLegacy) {
                this.geometry = geometry.legacyGeom;
                _super.prototype._renderDefault.call(this, renderer);
                this.geometry = geometry;
                return;
            }
            _super.prototype._renderDefault.call(this, renderer);
        };
        Plot.prototype._renderCanvas = function (renderer) {
            var _a = this.geometry, points = _a.points, stridePoints = _a.stridePoints;
            var context = renderer.context;
            var len = points.length;
            if (len < 2) {
                return;
            }
            var wt = this.transform.worldTransform;
            renderer.setContextTransform(wt);
            var scale = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
            context.lineWidth = this.shader.uniforms.lineWidth[0] + this.shader.uniforms.lineWidth[1] / scale;
            context.strokeStyle = PIXI.utils.hex2string(this.tint);
            context.globalAlpha = this.worldAlpha;
            context.beginPath();
            context.moveTo(points[0], points[1]);
            for (var i = 2; i < points.length; i += stridePoints) {
                context.lineTo(points[i], points[i + 1]);
            }
            context.stroke();
            context.beginPath();
            context.globalAlpha = 1.0;
        };
        return Plot;
    }(PIXI.Mesh));
    pixi_candles.Plot = Plot;
})(pixi_candles || (pixi_candles = {}));
var pixi_candles;
(function (pixi_candles) {
    var gradVert = "\nattribute vec2 aVertexPosition;\n\nuniform mat3 projectionMatrix;\nuniform mat3 translationMatrix;\nuniform vec2 rangeY;\n\nvarying float vOrdinate;\n\nvoid main(void)\n{\n    vec2 pos = (translationMatrix * vec3(aVertexPosition, 1.0)).xy;\n    if (pos.y > rangeY.y) {\n        pos.y = rangeY.y;\n    }\n    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);\n    vOrdinate = pos.y;\n}";
    var gradFrag = "\nvarying float vOrdinate;\n\nuniform vec4 colorTop;\nuniform vec4 colorBottom;\nuniform vec4 uColor;\nuniform vec2 rangeY2;\n\nvoid main(void)\n{\n    vec4 color = colorTop;\n    if (vOrdinate > rangeY2.x) {\n        if (vOrdinate >= rangeY2.y) {\n            color = colorBottom;\n        } else {\n            color = colorTop + (colorBottom - colorTop) * (vOrdinate - rangeY2.x) / (rangeY2.y - rangeY2.x);\n        }\n    }\n\n    color.rgb *= color.a;\n    gl_FragColor = color * uColor;\n}\n";
    var PlotGradientShader = (function (_super) {
        __extends(PlotGradientShader, _super);
        function PlotGradientShader() {
            var _this = this;
            var rangeY = new Float32Array(2);
            _this = _super.call(this, PIXI.Texture.WHITE, {
                uniforms: {
                    resolution: 1,
                    colorTop: new Float32Array([1, 1, 1, 1]),
                    colorBottom: new Float32Array([1, 1, 1, 1]),
                    rangeY: rangeY,
                    rangeY2: rangeY,
                },
                program: PlotGradientShader.getProgram()
            }) || this;
            return _this;
        }
        PlotGradientShader.getProgram = function () {
            if (!PlotGradientShader._prog) {
                PlotGradientShader._prog = new PIXI.Program(gradVert, gradFrag);
            }
            return PlotGradientShader._prog;
        };
        PlotGradientShader._prog = null;
        return PlotGradientShader;
    }(PIXI.MeshMaterial));
    pixi_candles.PlotGradientShader = PlotGradientShader;
    var TYPES = PIXI.TYPES;
    var PlotGradientGeometry = (function (_super) {
        __extends(PlotGradientGeometry, _super);
        function PlotGradientGeometry(_static) {
            if (_static === void 0) { _static = false; }
            var _this = _super.call(this) || this;
            _this.lastLen = 0;
            _this.lastPointNum = 0;
            _this.lastPointData = 0;
            _this.points = [];
            _this._floatView = null;
            _this._buffer = null;
            _this.stridePoints = 2;
            _this.strideFloats = 2 * 6;
            _this.strideBytes = 8 * 6;
            _this.initGeom(_static);
            _this.reset();
            return _this;
        }
        PlotGradientGeometry.prototype.initGeom = function (_static) {
            this._buffer = new PIXI.Buffer(new Float32Array(0), _static, false);
            this.addAttribute('aVertexPosition', this._buffer, 2, false, TYPES.FLOAT);
        };
        PlotGradientGeometry.prototype.moveTo = function (x, y) {
            var points = this.points;
            points.push(x);
            points.push(y);
        };
        PlotGradientGeometry.prototype.lineTo = function (x, y) {
            var points = this.points;
            points.push(x);
            points.push(y);
        };
        PlotGradientGeometry.prototype.invalidate = function (pointNum) {
            if (pointNum === void 0) { pointNum = 0; }
            this.lastPointNum = Math.min(pointNum, this.lastPointNum);
        };
        PlotGradientGeometry.prototype.reset = function () {
            if (this.lastLen > 0) {
                this.clearBufferData();
            }
            this.lastLen = 0;
            this.lastPointData = 0;
            this.points.length = 0;
        };
        PlotGradientGeometry.prototype.clearBufferData = function () {
            var _a = this, points = _a.points, strideFloats = _a.strideFloats, stridePoints = _a.stridePoints;
            this.lastPointNum = 0;
            this.lastPointData = 0;
            var arrayLen = Math.max(0, points.length / stridePoints - 1);
            this._floatView = new Float32Array(strideFloats * arrayLen);
            this._buffer.update(this._floatView);
            this.lastLen = points.length;
        };
        PlotGradientGeometry.prototype.updateBuffer = function () {
            var _a = this, points = _a.points, stridePoints = _a.stridePoints, strideFloats = _a.strideFloats;
            if (this.lastLen > points.length) {
                this.lastLen = -1;
            }
            if (this.lastLen < points.length
                || this.lastPointNum < this.lastLen) {
                this.clearBufferData();
            }
            if (this.lastPointNum == this.lastLen) {
                return;
            }
            var _floatView = this._floatView;
            this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
            var j = Math.round(this.lastPointNum * strideFloats / stridePoints);
            for (var i = this.lastPointNum; i < points.length - stridePoints; i += stridePoints) {
                var next = i + stridePoints;
                var x = points[i], y = points[i + 1], x2 = points[next], y2 = points[next + 1];
                var bottomLine = 10000.0;
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
            this.lastPointData = this.lastLen;
        };
        return PlotGradientGeometry;
    }(PIXI.Geometry));
    pixi_candles.PlotGradientGeometry = PlotGradientGeometry;
    var PlotGradient = (function (_super) {
        __extends(PlotGradient, _super);
        function PlotGradient() {
            var _this = _super.call(this, new PlotGradientGeometry(), new PlotGradientShader()) || this;
            _this.masterPlot = null;
            _this.plotUpdateId = -1;
            return _this;
        }
        Object.defineProperty(PlotGradient.prototype, "coordTop", {
            get: function () {
                return this.shader.uniforms.rangeY[0];
            },
            set: function (value) {
                this.shader.uniforms.rangeY[0] = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PlotGradient.prototype, "coordBottom", {
            get: function () {
                return this.shader.uniforms.rangeY[1];
            },
            set: function (value) {
                this.shader.uniforms.rangeY[1] = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PlotGradient.prototype, "alphaTop", {
            get: function () {
                return this.shader.uniforms.colorTop[3];
            },
            set: function (value) {
                this.shader.uniforms.colorTop[3] = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PlotGradient.prototype, "alphaBottom", {
            get: function () {
                return this.shader.uniforms.colorBottom[3];
            },
            set: function (value) {
                this.shader.uniforms.colorBottom[3] = value;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PlotGradient.prototype, "colorBottom", {
            get: function () {
                return PIXI.utils.rgb2hex(this.shader.uniforms.colorBottom);
            },
            set: function (value) {
                PIXI.utils.hex2rgb(value, this.shader.uniforms.colorBottom);
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(PlotGradient.prototype, "colorTop", {
            get: function () {
                return PIXI.utils.rgb2hex(this.shader.uniforms.colorTop);
            },
            set: function (value) {
                PIXI.utils.hex2rgb(value, this.shader.uniforms.colorTop);
            },
            enumerable: false,
            configurable: true
        });
        PlotGradient.prototype.clear = function () {
            if (!this.masterPlot) {
                this.geometry.reset();
            }
        };
        PlotGradient.prototype.moveTo = function (x, y) {
            this.lineTo(x, y);
        };
        PlotGradient.prototype.lineTo = function (x, y) {
            if (!this.masterPlot) {
                this.geometry.lineTo(x, y);
            }
        };
        PlotGradient.prototype._render = function (renderer) {
            var geom = this.geometry;
            if (this.masterPlot) {
                var plotGeom = this.masterPlot.geometry;
                if (this.plotUpdateId !== plotGeom.updateId) {
                    this.plotUpdateId = plotGeom.updateId;
                    geom.points = plotGeom.points;
                    geom.invalidate();
                }
            }
            geom.updateBuffer();
            this._renderDefault(renderer);
        };
        PlotGradient.prototype._renderCanvas = function (renderer) {
            var geom = this.geometry;
        };
        return PlotGradient;
    }(PIXI.Mesh));
    pixi_candles.PlotGradient = PlotGradient;
})(pixi_candles || (pixi_candles = {}));
var pixi_candles;
(function (pixi_candles) {
    PIXI.candles = pixi_candles;
})(pixi_candles || (pixi_candles = {}));
//# sourceMappingURL=pixi-candles.js.map