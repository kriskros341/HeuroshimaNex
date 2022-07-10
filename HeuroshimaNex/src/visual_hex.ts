import { vec2 } from "../../hex_toolkit"
import { GameHex } from "../../common"
import * as THREE from "three"

export const defaultColor = 0xeeeeee

export class VisualHex extends GameHex {
  static objects: VisualHex[] = []
  mesh: THREE.Mesh;
  radius: number
  height: number
  constructor(radius: number, height: number) {
    super()
    this.radius = radius;
    this.height = height;
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


let raycaster = new THREE.Raycaster();
let intersects: THREE.Intersection[] = [];
export let pointer: vec2;
export function getMouseoverFn<H extends VisualHex>(renderer: THREE.WebGLRenderer, cam: THREE.Camera) {
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
        return o as H;
      }
    }
    return null;
  }
  return select_hex_with_mouse_over
}