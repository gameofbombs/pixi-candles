// for type only
import {SHAPES} from '@pixi/math';

import type {Circle, Ellipse} from '@pixi/math';
import type {IShapeBuilder} from '../core/IShapeBuilder';
import {SmoothGraphicsData} from '../core/SmoothGraphicsData';
import {BuildData} from '../core/BuildData';
import {JOINT_TYPE} from "../core/const";

export class CircleBuilder implements IShapeBuilder {
    path(graphicsData: SmoothGraphicsData, target: BuildData) {
        // need to convert points to a nice regular data
        const circleData = graphicsData.shape as Circle;
        const points = graphicsData.points;
        const x = circleData.x;
        const y = circleData.y;
        let width;
        let height;
        // TODO - bit hacky??
        if (graphicsData.type === SHAPES.CIRC) {
            width = circleData.radius;
            height = circleData.radius;
        } else {
            const ellipseData = graphicsData.shape as Ellipse;

            width = ellipseData.width;
            height = ellipseData.height;
        }

        if (width === 0 || height === 0) {
            return;
        }

        points.push(x, y);

        let totalSegs = Math.floor(30 * Math.sqrt(circleData.radius))
            || Math.floor(15 * Math.sqrt(width + height));

        totalSegs /= 2.3;
        if (totalSegs < 3) {
            totalSegs = 3;
        }

        const seg = (Math.PI * 2) / totalSegs;

        for (let i = 0; i < totalSegs - 0.5; i++) {
            points.push(
                x + (Math.sin(-seg * i) * width),
                y + (Math.cos(-seg * i) * height)
            );
        }
    }

    fill(graphicsData: SmoothGraphicsData, target: BuildData) {
        const {verts, joints} = target;
        const {points, triangles} = graphicsData;

        let vertPos = 1;
        const center = 0;

        // Push center (special point)
        for (let i = 0; i < points.length; i += 2) {
            verts.push(points[i], points[i + 1]);
            joints.push(0);
            if (i > 2) {
                triangles.push(vertPos++, center, vertPos);
            }
        }
        triangles.push(vertPos, center, 1);
    }

    line(graphicsData: SmoothGraphicsData, target: BuildData): void {
        const {verts, joints} = target;
        const {points} = graphicsData;

        const joint = graphicsData.jointType();
        const len = points.length;

        verts.push(points[len - 2], points[len - 1]);
        joints.push(JOINT_TYPE.CAP_BUTT);
        for (let i = 2; i < len; i += 2) {
            verts.push(points[i], points[i + 1]);
            joints.push(joint);
        }
        verts.push(points[2], points[3]);
        joints.push(JOINT_TYPE.CAP_BUTT);
        verts.push(points[4], points[5]);
        joints.push(JOINT_TYPE.CAP_BUTT);
    }
}
