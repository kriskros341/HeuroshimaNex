import * as THREE from "three"
export const defaultColor = 0xeeeeee
export type vec2 = {x: number, y:number}

abstract class Board<H extends Hex> {
  abstract hexes: H[];
  constructor() {

  }
  abstract build(...args: any[]): void
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
  radius: number;
  height: number
  isTargetted: boolean =false;
  coords: {
    x: number,
    y: number
  } = {x: 0, y: 0}
  constructor(radius: number, height: number) {
    this.radius = radius;
    this.height = height;
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

export class VisualHex extends Hex {
  static objects: VisualHex[] = []
  mesh: THREE.Mesh;
  constructor(radius: number, height: number) {
    super(radius, height)
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 6, 1), 
      new THREE.MeshStandardMaterial({color: defaultColor})
    )
    this.mesh.rotation.set(Math.PI/2, 0, 0)
    VisualHex.objects.push(this)
  }
  getMat = (): THREE.MeshStandardMaterial => {
    if(Array.isArray(this.mesh.material)) {
      return this.mesh.material[0] as THREE.MeshStandardMaterial
    }
    return this.mesh.material as THREE.MeshStandardMaterial
  }
  placeOnGrid(x: number, y: number, gridOffset: number = 0) {
    super.placeOnGrid(x, y)
    this.mesh.position.set(
      (gridOffset + this.radius) * (Math.sqrt(3) *  x + Math.sqrt(3)/2 * y), (gridOffset+this.radius) * 3./2 * y, 0 
    )
  };
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


let raycaster = new THREE.Raycaster();
let intersects: THREE.Intersection[] = [];
export let pointer: vec2;
export const getMouseoverFn = (renderer: THREE.WebGLRenderer, cam: THREE.Camera) => {
  renderer.domElement.addEventListener("mousemove", (e) => {
    pointer = {
          x: (e.clientX / renderer.domElement.clientWidth) * 2 - 1,
          y: -(e.clientY / renderer.domElement.clientHeight) * 2 + 1,
      } 
    }, )
  const select_hex_with_mouse_over = () => {
    for(let o of VisualHex.objects) {
      raycaster.setFromCamera(pointer, cam);
      intersects = raycaster.intersectObject(o.mesh);
      if(intersects[0]) {
        return o;
      }
    }
    return null;
  }
  return select_hex_with_mouse_over
}