import {Tile} from "./Tile";

export class TileMap {
    x: number;
    y: number;
    z: number;
    width: number; // In amount of tiles
    height: number; // In amount of tiles

    tiles: Tile[];

    constructor(x: number, y: number, z: number = 0, width: number = 16, height: number = 16) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.width = width;
        this.height = height;
    }
}