import {BuildData} from "./BuildData";
import {SmoothGraphicsData} from "./SmoothGraphicsData";
import {JOINT_TYPE} from "./const";

export class SegmentPacker {
    strideFloats = 9;

    static vertsByJoint: Array<number> = [];

    updateBufferSize(jointStart: number, jointEnd: number, triangles: number, target: BuildData) {
        const {joints} = target;
        let foundTriangle = false;

        let vertexSize = 0;
        let indexSize = 0;
        for (let i = jointStart; i < jointEnd; i++) {
            const joint = joints[i];

            if (joint === 0) {
                foundTriangle = true;
            }

            const vs = SegmentPacker.vertsByJoint[i];
            vertexSize += vs;

            switch (vs) {
                case 4:
                    indexSize += 6;
                    break;
                case 8:
                    indexSize += 12;
                    break;
                case 9:
                    indexSize += 15;
                    break;
            }
        }
        if (foundTriangle) {
            indexSize += triangles;
        }

        target.vertexSize += vertexSize;
        target.indexSize += indexSize;
    }

    bufferPos = 0;
    indexPos = 0;
    bufFloat: Float32Array;
    bufUint: Uint8Array;
    indices: Uint16Array;
    buildData: BuildData;

    beginPack(buildData: BuildData, bufFloat: Float32Array, bufUint: Uint8Array, indices: Uint16Array, bufferPos: number = 0, indexPos: number = 0) {
        this.buildData = buildData;
        this.bufFloat = bufFloat;
        this.bufUint = bufUint;
        this.indices = indices;
        this.bufferPos = bufferPos;
        this.indexPos = indexPos;
    }

    endPack() {
        this.buildData = null;
        this.bufFloat = null;
        this.bufUint = null;
        this.indices = null;
    }

    packInterleavedGeometry(jointStart: number, jointEnd: number, triangles: number[],
                            lineStyle: number, color: number) {
        const {bufFloat, bufUint, indices, buildData} = this;
        const {joints, verts} = buildData;

        let bufPos = this.bufferPos;
        let indPos = this.indexPos;
        let index = this.bufferPos / this.strideFloats;

        let x1: number, y1: number, x2: number, y2: number, prevX: number, prevY: number, nextX: number, nextY: number;
        let type: number;
        let hasTriangle = false;
        for (let j = jointStart; j < jointEnd; j++) {
            const joint = joints[j];

            if (joint === JOINT_TYPE.FILL) {
                // just one vertex
                hasTriangle = true;
                continue;
            }

            if (joint >= JOINT_TYPE.CAP_BUTT) {
                continue;
            }

            x1 = verts[j * 2];
            y1 = verts[j * 2 + 1];
            x2 = verts[j * 2 + 2];
            y2 = verts[j * 2 + 3];
            //TODO: caps here
            prevX = verts[j * 2 - 2];
            prevY = verts[j * 2 - 1];

            if (joint !== JOINT_TYPE.JOINT_CAP_BUTT) {
                nextX = verts[j * 2 + 4];
                nextY = verts[j * 2 + 5];
            } else {
                nextX = verts[j * 2];
                nextY = verts[j * 2 + 1];
            }
            type = 1; // The joint

            for (let i = 0; i < 4; i++) {
                bufFloat[bufPos] = x1;
                bufFloat[bufPos + 1] = y1;
                bufFloat[bufPos + 2] = x2;
                bufFloat[bufPos + 3] = y2;
                bufFloat[bufPos + 4] = prevX;
                bufFloat[bufPos + 5] = prevY;
                bufFloat[bufPos + 6] = nextX;
                bufFloat[bufPos + 7] = nextY;
                bufFloat[bufPos + 8] = 8 * type + i;
                bufFloat[bufPos + 9] = lineStyle;
                bufUint[bufPos + 10] = color;
                bufPos += 9;
            }

            indices[indPos] = index;
            indices[indPos + 1] = index + 1;
            indices[indPos + 2] = index + 2;
            indices[indPos + 3] = index;
            indices[indPos + 4] = index + 2;
            indices[indPos + 5] = index + 3;

            indPos += 6;
            index += 4;
        }

        if (hasTriangle) {
            for (let i = 0; i < triangles.length; i++) {
                indices[indPos + i] = triangles[i] + index;
            }
            indPos += triangles.length;
        }

        this.bufferPos = bufPos;
        this.indexPos = indPos;
    }
}

const verts = SegmentPacker.vertsByJoint;
for (let i = 0; i < 32; i++)
    verts.push(0);
// simple fill
verts[JOINT_TYPE.FILL] = 1;
verts[JOINT_TYPE.JOINT_CAP_BUTT] = 4;

// no caps for now
// verts[JOINT_TYPE.JOINT_CAP_ROUND] = 4;
// verts[JOINT_TYPE.JOINT_CAP_SQUARE] = 4;
// verts[JOINT_TYPE.JOINT_BEVEL] = 4;
// verts[JOINT_TYPE.JOINT_ROUND] = 4;
// verts[JOINT_TYPE.JOINT_MITER] = 4;
// verts[JOINT_TYPE.JOINT_MITER_GOOD] = 4;

verts[JOINT_TYPE.JOINT_CAP_ROUND] = 4 + 4;
verts[JOINT_TYPE.JOINT_CAP_SQUARE] = 4 + 4;
verts[JOINT_TYPE.JOINT_BEVEL] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND] = 4 + 5;
verts[JOINT_TYPE.JOINT_MITER] = 4 + 5;
verts[JOINT_TYPE.JOINT_MITER_GOOD] = 4 + 4;

verts[JOINT_TYPE.CAP_ROUND] = 4;
verts[JOINT_TYPE.CAP_SQUARE] = 4;
verts[JOINT_TYPE.CAP_BUTT] = 0;
