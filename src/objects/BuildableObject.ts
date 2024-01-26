export class BuildableObject {
  object_type: string;
  id: string;
  posX: number;
  posY: number;
  width: number;
  height: number;

  constructor(
    object_type: string,
    id: string,
    posX: number,
    posY: number,
    width: number,
    height: number,
  ) {
    this.object_type = object_type;
    this.id = id;
    this.posX = posX;
    this.posY = posY;
    this.width = width;
    this.height = height;
  }
}
