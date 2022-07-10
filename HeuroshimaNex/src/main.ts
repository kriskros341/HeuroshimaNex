import * as THREE from 'three'
import { WebGL1Renderer, OrthographicCamera } from 'three'
import './style.css'
import { io } from "socket.io-client"

import { Hex, VisualHex, getMouseoverFn, HexaBoard, defaultColor } from "./hex_toolkit"

const element = document.querySelector("#app")!

const button=document.querySelector("#butt")!


class MyRenderer extends WebGL1Renderer {
  constructor() {
    super()
    this.setPixelRatio(devicePixelRatio)
    this.setSize(innerWidth, innerHeight)
    this.setClearColor(new THREE.Color(0, 0, 0))
  }
}


class MyCamera extends OrthographicCamera{
  static viewSize = 20;
  static aspectRatio = window.innerWidth / window.innerHeight
  constructor(){
    super(  -MyCamera.aspectRatio * MyCamera.viewSize / 2, MyCamera.aspectRatio * MyCamera.viewSize / 2, 
    MyCamera.viewSize / 2, -MyCamera.viewSize / 2,
    0, 1000)
    this.position.set(0,0,2)
  }
}


let clicked = false
addEventListener("click", () => {
  const o = select_hex_with_mouse_over()
  o?.getMat().color.set(0x692137)
  console.log(o?.coords)
})


const renderer = new MyRenderer()
renderer.domElement.addEventListener("pointerdown", () => {
  for(let h of board.hexes)
  {
    h.getMat().color.set(defaultColor)
    h.isTargetted=false
  }
  let o = select_hex_with_mouse_over()
  o?.getMat().color.set(0x692137)
  if(o){o.isTargetted=true}
  clicked = true
  console.log("jd")
})

renderer.domElement.addEventListener("pointerup", () => {
  clicked = false
})

renderer.domElement.addEventListener("pointermove", () => {
  if(clicked) {
    let o = select_hex_with_mouse_over()
    o?.getMat().color.set(0x692137)
    if(o){o.isTargetted=true}
    
  }
})
renderer.domElement.addEventListener("dblclick",()=>{
  let o = select_hex_with_mouse_over()
  o?.getMat().color.set(0xFF0000)
  console.log("dble")
})
button.addEventListener("click",()=>{
  for(let h of board.hexes){
    if(h.isTargetted==true){
      h.getMat().color.set(0x0000ff)
    }

  }
})
const rerender = () => {
  requestAnimationFrame(rerender)
  renderer.render(scene, camera)
}


const scene = new THREE.Scene()
const camera = new MyCamera()
const select_hex_with_mouse_over = getMouseoverFn(renderer, camera)
const board = new HexaBoard<VisualHex>(4, 0.25, VisualHex)
const light = new THREE.AmbientLight(0xffffff, 0.4)



board.build(1, 1, 0)
board.hexes.forEach(hex => scene.add(hex.mesh))
element?.appendChild(renderer.domElement)
scene.add(light)


const socket = io("ws://83.26.47.58:8000/")
socket.on("connect", () => {
  console.log("connect")
})

rerender()

/*
Chcemy żeby dało się zaznaczyć hexagon
*/