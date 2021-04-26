import {smoothBuildLine} from './smoothBuildLine';
import {GraphicsData, GraphicsGeometry} from '@pixi/graphics';
import {TYPES} from '@pixi/constants';

export class SmoothGraphicsGeometry extends GraphicsGeometry
{
    constructor() {
        super();

        this.addAttribute('aTextureId', this._buffer, 1, true, TYPES.FLOAT)
    }

    protected processLine(data: GraphicsData): void
    {
        smoothBuildLine(data, this);

        for (let i = 0; i < data.holes.length; i++)
        {
            smoothBuildLine(data.holes[i], this);
        }
    }
}
