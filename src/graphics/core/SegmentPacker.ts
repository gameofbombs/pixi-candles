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
                case 4: indexSize += 6;break;
                case 8: indexSize += 12;break;
                case 9: indexSize += 15;break;
            }
        }
        if (foundTriangle) {
            indexSize += triangles;
        }

        target.vertexSize += vertexSize;
        target.indexSize += indexSize;
    }
}

const verts = SegmentPacker.vertsByJoint;
for (let i = 0; i < 32; i++)
    verts.push(0);
// simple fill
verts[JOINT_TYPE.FILL] = 1;
verts[JOINT_TYPE.JOINT_CAP_BUTT] = 4;
verts[JOINT_TYPE.JOINT_CAP_ROUND] = 4 + 4;
verts[JOINT_TYPE.JOINT_CAP_SQUARE] = 4 + 4;
verts[JOINT_TYPE.JOINT_BEVEL] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND] = 4 + 5;
verts[JOINT_TYPE.JOINT_MITER] = 4 + 5;
verts[JOINT_TYPE.JOINT_MITER_GOOD] = 4 + 4;
verts[JOINT_TYPE.CAP_ROUND] = 4;
verts[JOINT_TYPE.CAP_SQUARE] = 4;
verts[JOINT_TYPE.CAP_BUTT] = 0;
