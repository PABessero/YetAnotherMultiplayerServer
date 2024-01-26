export class Player {
  id: string;
  posX: number;
  posY: number;

  constructor(id: string, posX = 128, posY = 608) {
    this.id = id;
    this.posX = posX;
    this.posY = posY;
  }
}
