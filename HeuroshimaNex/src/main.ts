import * as THREE from 'three'
import { WebGL1Renderer, OrthographicCamera } from 'three'
import './style.css'
import { io } from "socket.io-client"
import { HexaBoard, vec2 } from "../../hex_toolkit"
import { VisualHex, getMouseoverFn, TileState, getColorFrom } from './visual_hex'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { Player, buildStructureInterface, response, TileBuiltType, tileInterface } from "../../common"

const element = document.querySelector("#app")!
const build_structure_btn = document.querySelector("#butt")!
const restart_server_btn = document.querySelector("#restart_server_btn")!
const statsScreen = document.getElementById("stats")!
const builderScreen = document.getElementById("builder")!
const currentCoordsX = document.querySelector("#coordsX")!
const currentCoordsY = document.querySelector("#coordsY")!
const currentTileStatus = document.getElementById("tileStatus")!
const gamerList = document.querySelector("#gamerList")!
const build_army_btn = document.querySelector("#armyBtn")!
const build_obstacle_btn = document.querySelector("#obstacleBtn")!
const build_base_btn = document.querySelector("#baseBtn")!
function showCurrentTile(hex?: InteractiveVisualHex) {
  if(!hex) {
    statsScreen.classList.add("hidden")
  } else {
    statsScreen.classList.remove("hidden")
    currentCoordsX.innerHTML = hex.coords.x.toString()
    currentCoordsY.innerHTML = hex.coords.y.toString()
    let s:string
    switch(hex.tileOccupant){
      case(TileBuiltType.free):{
        s="Free"
        break;
      } 
      case(TileBuiltType.army):{
        s="Army"
        break;
      }
      case(TileBuiltType.obstacle): {
        s="Obstacle"
        break;
      }
      case(TileBuiltType.base): {
        s="Base"
        break;
      }
    }
    currentTileStatus.innerHTML=s
  }
}
function showBuildMenu(hex?:InteractiveVisualHex){
  if(hex) {
    builderScreen.classList.remove("hidden")
    
  } else {
    builderScreen.classList.add("hidden")
  }
}

function reset(){
  console.log("reset!")
  for(let h of board.hexes){
    h.reset()
    h.tileOccupant=TileBuiltType.free
    h.updateColor()
  }
}

restart_server_btn.addEventListener("click", () => {
  socket.emit("req:restart", (response: any) => {
    if(response.status=="OK"){
      console.log("reset done!")
    }
  })
})

function updatePlayerList(){
  gamerList.innerHTML= "List of gamers:"
  const br = document.createElement("br")
  gamerList.appendChild(br)
  const tag = document.createElement("ol")
  for(let k of Player.objects){
    const gamerItem = document.createElement("li")
    console.log(k.id)
    gamerItem.innerHTML = k.id
    if(k.id == socket.id) {
      gamerItem.classList.add("mine")
    }
    tag.appendChild(gamerItem)
  }
  gamerList.appendChild(tag)
}


function buildObject(type:TileBuiltType,tile:vec2){
  const hex = board.getTileByCoords(tile)
  hex && socket.emit("req:build", tile, type, (response: response<buildStructureInterface>) => {
    switch(response.status) {
      case "OK": {
        hex.build(response.data!.type)//do zmian
        hex.buildStructure(response.data!.type)//do zmian
        showCurrentTile(hex)
        break;
      }
      case "NOPE": {
        console.error("req:build response:", response)        
      }
    }
  })
}

function checkIfCanPlace() {
  if(!player.selectedTile) {
    console.log("No tile selected!")
    return null;
  }
  const tile = board.getTileByCoords(player.selectedTile)
  if(!tile) {
    console.error("The tile doesnt exist!")
    return null;
  }
  return tile
}

build_structure_btn.addEventListener("click", ()=>{
  const tile = checkIfCanPlace()
  tile && buildObject(TileBuiltType.base, tile.coords)
})
build_army_btn.addEventListener("click", ()=>{
  const tile = checkIfCanPlace()
  tile && buildObject(TileBuiltType.army, tile.coords)
})
build_base_btn.addEventListener("click", ()=>{
  const tile = checkIfCanPlace()
  tile && buildObject(TileBuiltType.base, tile.coords)
})
build_obstacle_btn.addEventListener("click", ()=>{
  const tile = checkIfCanPlace()
  tile && buildObject(TileBuiltType.obstacle, tile.coords)
})
/*
build_army_btn.addEventListener("click", ()=>{
  if(!player.selectedTile) {
    console.log("No tile selected!")
    return;
  }
  const tile = board.getTileByCoords(player.selectedTile)
  if(!tile) {
    console.error("The tile doesnt exist!")
    return;
  }
  socket.emit("req:buildArmy", tile.coords, (response: any) => {
    switch(response.status) {
      case "OK": {
        tile.build(TileBuiltType.army)//do zmian
        tile.buildStructure(TileBuiltType.army)//do zmian
        currentTileStatus.innerHTML="Taken"
        break;
      }
      case "NOPE": {
        console.error("req:build response:", response)        
      }
    }
  })
})
*/
class VisualHexaBoard extends HexaBoard<InteractiveVisualHex> {
  constructor(radius: number, gap: number) {
    super(radius, gap, InteractiveVisualHex)
  }
  updateTiles() {
    this.hexes.forEach((hex) => {
      hex.updateColor()
    })
  }
}

const clearSelection = () => {
  console.log(
    InteractiveVisualHex.objects.filter(t => t.tileStatus == TileState.freeTargetted)
  )
  InteractiveVisualHex.objects
    .filter(
      tile => tile.tileStatus == TileState.freeTargetted ||
      tile.tileStatus==TileState.freeSelected
    )
    .forEach(
      tile => tile.setState(TileState.free)
    )
  InteractiveVisualHex.objects
    .filter(
      tile => tile.tileStatus == TileState.takenTargetted ||
      tile.tileStatus == TileState.takenSelected
    )
    .forEach(
      tile => tile.setState(TileState.taken)
    )
  InteractiveVisualHex.objects.forEach(tile => tile.updateColor())
}


class InteractiveVisualHex extends VisualHex {
  constructor(radius: number, height: number) {
    super(radius, height)
  }
  target(){
    console.log("target")
    clearSelection()
    this.setState(
      this.tileStatus == TileState.taken ? TileState.takenTargetted : TileState.freeTargetted
    )
    this.updateColor()
    showCurrentTile(this)
    showBuildMenu()
    player.selectedTile = undefined
  }
  select() {
    clearSelection()
    console.log("SELECT")
    if(this.tileStatus != TileState.taken) {
      this.setState(TileState.freeSelected)
      this.updateColor()
      showBuildMenu(this)
    }
    else{console.log("Zombie tile")}
  } 
  deselect() {
    this.setState(TileState.free)
    this.updateColor()
    statsScreen.classList.add("hidden")
    builderScreen.classList.add("hidden")
  }
  updateColor(): void {
    if(this.owner?.color) {
      console.log("jdjd")
      super.updateColor(
        getColorFrom(this.owner.color)
      )
    } else {
      super.updateColor()
    }
  }
  buildStructure(type:TileBuiltType) {
    console.log(this.owner)
    this.setState(TileState.taken)
    this.updateColor()
    this.build(type)
    //this.tileOccupant=
  }
}

class MyRenderer extends WebGL1Renderer {
  constructor() {
    super()
    this.setPixelRatio(devicePixelRatio)
    this.setSize(innerWidth, innerHeight)
    this.setClearColor(new THREE.Color(0, 0, 0))
  }
  setupEventListeners() {
    this.domElement.addEventListener("dblclick",()=>{
      let o = select_hex_with_mouse_over()
      if(o) {
        o.select();
        player.selectedTile = o.coords
      }
    })
    
    this.domElement.addEventListener("click", () => {
      let o = select_hex_with_mouse_over()
      if(o) {
        o.target()
      } else {
        console.log("TESET")
        player.selectedTile = undefined
        showCurrentTile()
        showBuildMenu()
        clearSelection()
      }
    })
    /*
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
    this.position.set(0,0,20)
  }
}

class VisualPlayer {
  selectedTile: vec2 | undefined
  constructor() {
  }
}

const player = new VisualPlayer()

//DISPLAYED

const renderer = new MyRenderer()

const scene = new THREE.Scene()
const camera = new MyCamera()
const select_hex_with_mouse_over = getMouseoverFn<InteractiveVisualHex>(renderer, camera)
let board = new VisualHexaBoard(4, 0.25)


const point = new THREE.PointLight(0xffffff, 0.5)
point.position.set(0, 0, 5)
scene.add(point)
const light = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(light)


board.build(1, 1, 0)
board.hexes.forEach(hex => scene.add(hex.mesh))
element?.appendChild(renderer.domElement)
renderer.setupEventListeners()

//SOCKET

let p: Player | undefined

const socket = io("ws://heuroshimanex.ddns.net:8000/")

const handleBoardUpdate = (response: response<tileInterface[]>) => {
  console.log(response)
  switch(response.status) {
    case "OK": {
      response.data?.forEach((hexState, idx) => {
        board.hexes[idx].loadState(hexState)
      })
      board.updateTiles()
      break;
    }
    default: {
      console.log("JP2GMD")
    }
  }
}

socket.on("broad:board", (tiles: tileInterface[]) => {
  board.hexes.forEach(
    (hex, idx) => hex.loadState(tiles[idx])
  )
  board.updateTiles()
})
socket.on("connect", () => {
  console.log("connect")
  socket.emit("getBoard", handleBoardUpdate)
})
socket.on("broad:restart", () => {
  reset()
})
socket.on("broad:build", (broadcast: buildStructureInterface) => {
  let tile = board.getTileByCoords(broadcast.tile)
  let player = Player.objects.find(p => p.id == broadcast.playerId)
  if(tile && player) {
    tile.setOwner(player)
    tile.buildStructure(broadcast.type)
  }
  console.log("broad: build", tile)
})

socket.on("broad:create_player", (data) => {
  console.log("borad create")
  new Player(data.id, data.color)  
  updatePlayerList()
})
socket.on("resp:create_player", (data) => {
  console.log("resp create")
  new Player(data.id, data.color)  
  updatePlayerList()
})
socket.on("broad:remove_player", id => {
  console.log("broad:remove", id)
  Player.objects = Player.objects.filter(p => p.id != id)
  updatePlayerList()
})
socket.emit("req:create_player", (response: {code: string, color: [number, number, number]}) => {
  p = new Player(socket.id)
  p.setColor(response.color)
})

//RENDER
const oc = new OrbitControls(camera, renderer.domElement)
const rerender = () => {
  requestAnimationFrame(rerender)
  oc.update()
  renderer.render(scene, camera)
}
rerender()

/*
Cele na teraz:


- Tylko gracz którego jest tura na raz jest 
w stanie oznaczyć pole na mapie

- Serwer odpowiada za logikę i stan gry 
i klient odpowiada za wyświetlanie i interakcję

klient i serwer powinni dzielić tylko to co muszą

- Klient pyta serwera czy można oznaczyć dane pole
  - Jeśli nie wyświetli się błąd i nic się nie stanie
*/