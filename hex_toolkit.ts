export type vec2 = {x: number, y:number}

abstract class Board<H extends Hex> {
  abstract hexes: H[];
  constructor() {

  }
  abstract build(...args: any[]): void
  getTileByCoords(coords: vec2) {
    return this.hexes.find(hex => hex.coords.x == coords.x && hex.coords.y == coords.y)
  }
}

export class Grid<H extends Hex> extends Board<H> {
  hexes: H[] = [];
  width: number;
  height: number
  type: any
  constructor(width: number, height: number, type: typeof Hex = Hex) {
    super()
    this.type = type
    this.width = width
    this.height = height
  }
  build(...args: any[]) {
    for(let i = 0; i < this.height; i++) {
      for(let j = 0; j < this.width; j++) {
        let hex = new this.type(...args)
        hex.placeOnGrid(Math.floor(-i/2) + j, i, 0.2)
        this.hexes.push(hex);
      }
    }
  } 
}

export class HexaBoard<H extends Hex> extends Board<H> {
  hexes: H[] = [];
  type: any
  radius: number
  gap: number
  constructor(radius: number, gap: number = 0, type: typeof Hex = Hex) {
    super()
    this.type = type
    this.radius = radius
    this.gap = gap
  }
  rebuild(...args: any[]) {
    this.type.objects = this.type.objects.filter((h: H) => !this.hexes.includes(h))
  }
  build(...args: any[]) {
    for(let i = -this.radius; i <= this.radius; i++) {
      let r1 = Math.max(-this.radius, -i - this.radius)
      let r2 = Math.min(this.radius, -i + this.radius)
      for (let j = r1; j <= r2; j++) {
        let hex = new this.type(...args)
        hex.placeOnGrid(i, j, this.gap)
        this.hexes.push(hex);
      }
    }
  } 
}

export class Hex {
  static objects: Hex[] = []
  coords: {
    x: number,
    y: number
  } = {x: 0, y: 0}
  constructor(...args: any[]) {
    Hex.objects.push(this)
  }
  //arrow function would get actually erased
  placeOnGrid(x: number, y: number) {
    this.coords = {
      x: x,
      y: y
    }
  }
}


export const select_hexes_diagonally = (t: vec2, options: {r:boolean, q:boolean, s:boolean} = {r: true, q: true, s: true}): Hex[] => {
  return Hex.objects.filter((t2) => (options.r && t2.coords.x == t.x) || (options.q && t2.coords.y == t.y) || (options.s && -t2.coords.x-t2.coords.y == -t.x - t.y))
}

export const around = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [-1, 1],
  [1, -1]
]

export function select_hexes_around(coords: vec2): Hex[] {
  let neighbours: vec2[] = around.map(v => ({x: v[0], y: v[1]}))
  let tiles = Hex.objects.filter(t => {
    for(let n of neighbours) {
      if (t.coords.x == coords.x + n.x && t.coords.y == coords.y + n.y) {
        return true;
      }
    }
    return false
  })
  return tiles
}

