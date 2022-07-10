import * as THREE from 'three'
import { WebGL1Renderer, OrthographicCamera, Triangle } from 'three'
import './style.css'
import { io } from "socket.io-client"

import { HexaBoard, vec2 } from "../../hex_toolkit"
import { VisualHex, getMouseoverFn, defaultColor } from './visual_hex'

const element = document.querySelector("#app")!
const button = document.querySelector("#butt")!
const restart_server_btn = document.querySelector("#restart_server_btn")!
restart_server_btn.addEventListener("click", () => {
  socket.emit("req:restart", (response: any) => {
    console.log(response)
  })
})
button.addEventListener("click", ()=>{
  if(!thisPlayer.selectedTile) {
    console.log("No tile selected!")
    return;
  }
  const tile = board.getTileByCoords(thisPlayer.selectedTile)
  if(!tile) {
    console.error("The tile doesnt exist!")
    return;
  }
  socket.emit("req:tileSelect", tile.coords, (response: any) => {
    switch(response.status) {
      case "OK": {
        tile.buildStructure()
        break;
      }
      case "NOPE": {
        console.error("req:tileSelect response:", response)
        
      }
    }
  })
})

class InteractiveVisualHex extends VisualHex {
  constructor(radius: number, height: number) {
    super(radius, height)
  }
  select() {
    this.getMat().color.set(0xff0000)
  }
  deselect() {
    this.getMat().color.set(defaultColor)
  }
  buildStructure() {
    this.getMat().color.set(0x00ff00)
  }
}

class MyRenderer extends WebGL1Renderer {
  constructor() {
    super()
    this.setPixelRatio(devicePixelRatio)
    this.setSize(innerWidth, innerHeight)
    this.setClearColor(new THREE.Color(0, 0, 0))
  }
  selectTile() {
    for(let h of board.hexes)
    {
      h.getMat().color.set(defaultColor)
      h.isTargetted=false
    }
    let o = select_hex_with_mouse_over()
    if(o){
      o.getMat().color.set(0x692137)
      o.isTargetted=true
    }
  }
  setupEventListeners() {
    this.domElement.addEventListener("dblclick",()=>{
      let o = select_hex_with_mouse_over()
      if(o) {
        o.select();
        thisPlayer.selectedTile = o.coords
      }
    })
    /*
    this.domElement.addEventListener("click", () => {
      this.selectTile()
    })
    this.domElement.addEventListener("pointerup", () => {
      clicked = false
    })
    this.domElement.addEventListener("pointermove", () => {
      if(clicked) {
        let o = select_hex_with_mouse_over()
        o?.getMat().color.set(0x692137)
        if(o){o.isTargetted=true}
      }
    })
    */

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

class Player {
  selectedTile: vec2 | undefined
  constructor() {

  }
}

const thisPlayer = new Player()


//DISPLAYED

const renderer = new MyRenderer()

const scene = new THREE.Scene()
const camera = new MyCamera()
const select_hex_with_mouse_over = getMouseoverFn<InteractiveVisualHex>(renderer, camera)
const board = new HexaBoard<InteractiveVisualHex>(4, 0.25, InteractiveVisualHex)
const light = new THREE.AmbientLight(0xffffff, 0.4)


board.build(1, 1, 0)
board.hexes.forEach(hex => scene.add(hex.mesh))
element?.appendChild(renderer.domElement)
scene.add(light)
renderer.setupEventListeners()

//SOCKET


const socket = io("ws://83.26.59.107:8000/")

socket.on("resp:getBoard", (hb: HexaBoard<VisualHex>) => {
  console.log(hb)
})
socket.on("connect", () => {
  console.log("connect")
  socket.emit("getBoard")
})

//RENDER

const rerender = () => {
  requestAnimationFrame(rerender)
  renderer.render(scene, camera)
}
rerender()

/*
Cele na teraz:

- Wielu graczy widzi tą samą mapę
- Tylko gracz którego jest tura na raz jest 
w stanie oznaczyć pole na mapie

- Serwer odpowiada za logikę i stan gry 
i klient odpowiada za wyświetlanie i interakcję

klient i serwer powinni dzielić tylko to co muszą

- Klient pyta serwera czy można oznaczyć dane pole
  - Jeśli nie wyświetli się błąd i nic się nie stanie

*/