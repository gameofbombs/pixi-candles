import type {IShapeBuilder} from '../core/IShapeBuilder';
import {SmoothGraphicsData} from '../core/SmoothGraphicsData';
import {BuildData} from '../core/BuildData';
import {JOINT_TYPE} from '../core/const';
import {Point, Polygon} from "@pixi/math";
import {earcut} from '@pixi/utils';


export class PolyBuilder implements IShapeBuilder {
    path(graphicsData: SmoothGraphicsData, buildData: BuildData) {
        const shape = graphicsData.shape as Polygon;
        let points = graphicsData.points = shape.points.slice();
        const eps = buildData.closePointEps;
        const eps2 = eps * eps;

        if (points.length === 0) {
            return;
        }

        const firstPoint = new Point(points[0], points[1]);
        const lastPoint = new Point(points[points.length - 2], points[points.length - 1]);
        const closedShape = graphicsData.closeStroke = shape.closeStroke;

        let len = points.length;
        let newLen = 0;

        // 1. remove equal points
        for (let i = 2; i < len; i += 2) {
            const x1 = points[i - 2], y1 = points[i - 1], x2 = points[i], y2 = points[i + 1];
            let flag = true;
            if (Math.abs(x1 - x2) < eps
                && Math.abs(y1 - y2) < eps) {
                flag = false;
            }

            if (flag) {
                points[newLen] = points[i];
                points[newLen + 1] = points[i + 1];
                newLen += 2;
            }
        }
        points.length = len = newLen;

        newLen = 0;
        // 2. remove middle points
        for (let i = 2; i + 2 < len; i += 2) {
            let x1 = points[i - 2], y1 = points[i - 1], x2 = points[i], y2 = points[i + 1],
                x3 = points[i + 2], y3 = points[i + 3];

            x1 -= x2;
            y1 -= y2;
            x3 -= x2;
            y3 -= y2;
            let flag = true;
            if (Math.abs(x3 * y1 - y3 * x1) < eps2) {
                if (x1 * x2 + y1 * y2 < -eps2) {
                    flag = false;
                }
            }

            if (flag) {
                points[newLen] = points[i];
                points[newLen + 1] = points[i + 1];
                newLen += 2;
            }
        }
        points.length = len = newLen;

        if (len <= 2) {
            // suddenly, nothing
            return;
        }

        // 3. for closed shape - add extra points
        const closedPath = Math.abs(firstPoint.x - lastPoint.x) < eps
            && Math.abs(firstPoint.y - lastPoint.y) < eps;

        // if the first point is the last point - gonna have issues :)
        if (closedShape) {
            if (closedPath) {
                points.pop();
                points.pop();
            }
        }
    }

    line(graphicsData: SmoothGraphicsData, buildData: BuildData) {
        const {closeStroke, points} = graphicsData;
        const eps = buildData.closePointEps;
        const eps2 = eps * eps;
        const len = points.length;
        const style = graphicsData.lineStyle;

        if (len <= 2) {
            return;
        }
        const {verts, joints} = buildData;

        //TODO: alignment

        let joint = graphicsData.jointType();
        let cap = graphicsData.capType();

        let prevX: number, prevY: number;
        if (closed) {
            prevX = points[len - 2];
            prevY = points[len - 1];
            joints.push(JOINT_TYPE.CAP_BUTT);
        } else {
            prevX = points[2];
            prevY = points[3];
            joints.push(cap);
        }
        verts.push(prevX, prevY);

        /* Line segments of interest where (x1,y1) forms the corner. */
        for (let i = 0; i + 2 < len; i += 2) {
            const x1 = points[i], y1 = points[i + 1], x2 = points[i + 2], y2 = points[i + 3];
            const dx = x2 - x1;
            const dy = y2 - y1;

            let prevX: number, prevY: number;
            if (i > 0) {
                prevX = points[i - 2];
                prevY = points[i - 1];
            } else {
                prevX = x1 - dx;
                prevY = y1 - dy;
            }

            let endJoint = 0;
            let nextX: number, nextY: number;
            if (i + 4 < len) {
                nextX = points[i + 4];
                nextY = points[i + 5];
                const dx2 = nextX - x2;
                const dy2 = nextY - y2;

                if (joint === JOINT_TYPE.JOINT_MITER && dx2 * dx + dy2 * dy < eps) {
                    endJoint = JOINT_TYPE.JOINT_MITER_GOOD; // its a good miter
                } else {
                    endJoint = joint;
                }

                const D = dx2 * dy - dy2 * dx;
                if (Math.abs(D) < eps) {
                    // go in reverse!
                    switch (joint) {
                        case JOINT_TYPE.JOINT_ROUND:
                            endJoint = JOINT_TYPE.JOINT_CAP_ROUND;
                            break;
                        case JOINT_TYPE.JOINT_BEVEL:
                            endJoint = JOINT_TYPE.JOINT_CAP_BUTT;
                            break;
                        default:
                            endJoint = JOINT_TYPE.JOINT_CAP_SQUARE;
                            break;
                    }
                }
            } else {
                nextX = points[0];
                nextY = points[1];
                if (closed) {
                    endJoint = cap - JOINT_TYPE.CAP_BUTT + JOINT_TYPE.JOINT_CAP_BUTT;
                }
            }

            verts.push(x1, y1);
            joints.push(endJoint);
        }

        if (closed) {
            verts.push(points[0], points[1]);
            joints.push(JOINT_TYPE.CAP_BUTT);
        }
    }

    fill(graphicsData: SmoothGraphicsData, buildData: BuildData) {
        let points = graphicsData.points;
        //TODO: simplify holes too!
        const holes = graphicsData.holes;

        const {verts, joints} = buildData;

        if (points.length >= 6) {
            const holeArray = [];
            // Process holes..

            for (let i = 0; i < holes.length; i++) {
                const hole = holes[i];

                holeArray.push(points.length / 2);
                points = points.concat(hole.points);
            }

            // sort color
            graphicsData.triangles = earcut(points, holeArray, 2);

            if (!graphicsData.triangles) {
                return;
            }

            for (let i = 0; i < points.length; i += 2) {
                verts.push(points[i], points[i + 1]);
                joints.push(0);
            }
        }
    }
}
