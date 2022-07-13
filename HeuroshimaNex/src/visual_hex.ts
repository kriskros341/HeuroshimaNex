import { vec2 } from "../../hex_toolkit"
import { GameHex, Player, tileInterface, TileBuild } from "../../common"
import * as THREE from "three"

export enum TileBuiltType{
  free,
  army,
  obstacle,
  base
}
export const getColorFrom = (tple: [number, number, number]) => {
  return new THREE.Color(tple[0]/255.0, tple[1]/255.0, tple[2]/255.0)
}

export enum TileState {
  free = 0xeeeeee,//grey
  taken=0x00ff00,//gree
  freeTargetted=0x0000ff,//blue
  freeSelected=0xff0000,//red
  takenTargetted=0x36862b,//dark green
  takenSelected=0x3e543b //darker green
}

export class VisualHex extends GameHex {
  static objects: VisualHex[] = []
  mesh: THREE.Mesh;
  radius: number
  height: number
  tileStatus: TileState = TileState.free
  reset() {
    this.tileStatus=TileState.free
    super.reset()
  }
  getIsTaken(){
    if(this.tileStatus==TileState.taken||this.tileStatus==TileState.takenSelected||this.tileStatus==TileState.takenTargetted)
   { return true}
    return false
  }
  build(type: TileBuild) {
    super.build(type)
    this.tileStatus=TileState.taken
  }
  select(){
    this.tileStatus = this.isTaken ? TileState.takenSelected : TileState.freeSelected
  }
  loadState(state: tileInterface) {
    super.loadState(state)
    this.tileStatus = state.buildType == TileBuild.free ? TileState.free : TileState.taken
  }
  constructor(radius: number, height: number) {
    super()
    this.radius = radius;
    this.height = height;
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 6, 1), 
      new THREE.MeshStandardMaterial({color: TileState.free})
    )
    this.buildColor = TileState.taken
    this.mesh.rotation.set(Math.PI/2, 0, 0)
    VisualHex.objects.push(this)
  }
  buildColor: THREE.ColorRepresentation
  setOwner(player: Player) {
    super.setOwner(player)
    this.buildColor = getColorFrom(player.color!)
  }
  setState(state: TileState){
    this.tileStatus = state
  }
  updateColor(color?: THREE.ColorRepresentation){ 
    this.getMat().color.set(color ? color : this.tileStatus)
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


let raycaster = new THREE.Raycaster();
let intersects: THREE.Intersection[] = [];
export let pointer: vec2 | undefined = undefined
export function getMouseoverFn<H extends VisualHex>(renderer: THREE.WebGLRenderer, cam: THREE.Camera) {
  renderer.domElement.addEventListener("mousemove", (e) => {
    pointer = {
          x: (e.clientX / renderer.domElement.clientWidth) * 2 - 1,
          y: -(e.clientY / renderer.domElement.clientHeight) * 2 + 1,
      } 
    }, )
  const select_hex_with_mouse_over = () => {
    if(!pointer)
      return null
    for(let o of VisualHex.objects) {
      raycaster.setFromCamera(pointer, cam);
      intersects = raycaster.intersectObject(o.mesh);
      if(intersects[0]) {
        return o as H;
      }
    }
    return null;
  }
  return select_hex_with_mouse_over
}