import {Hex, vec2} from "./hex_toolkit"

export enum TileState {
  free = 0xeeeeee,//grey
  taken=0x00ff00,//gree
  freeTargetted=0x0000ff,//blue
  freeSelected=0xff0000,//red
  takenTargetted=0x36862b,//dark green
  takenSelected=0x3e543b //darker green
}
export enum TileBuiltType{
  free,
  army,
  obstacle,
  base
}

export interface response<T> {
  status: string
  data?: T;
}

export interface tileInterface {
  ownerId: string | undefined
  buildType: TileBuiltType
}

export interface buildStructureInterface {
  tile: vec2
  type: TileBuiltType
  playerId: string
}

export class GameHex extends Hex {
  isTaken: boolean = false
  tileStatus: TileState = TileState.free
  tileOccupant:TileBuiltType=TileBuiltType.free
  owner: Player | undefined
  setOwner(player: Player) {
    this.owner = player
  }
  reset() {
    this.tileOccupant = TileBuiltType.free
    this.tileStatus=TileState.free
    this.isTaken = false
    this.owner = undefined
    this.clearOwner()
  }
  loadState(state: tileInterface) : void {
    this.owner = Player.getById(state.ownerId)
    this.tileOccupant = state.buildType
    this.tileStatus = state.buildType == TileBuiltType.free ? TileState.free : TileState.taken
    this.isTaken = state.buildType == TileBuiltType.free ? false : true
  }
  serialize() : tileInterface {
    return {
      ownerId: this.owner?.id,
      buildType: this.tileOccupant
    }
  }
  clearOwner() {
    this.owner = undefined
  }
  getIsTaken(){
    if(this.tileStatus==TileState.taken||this.tileStatus==TileState.takenSelected||this.tileStatus==TileState.takenTargetted)
   { return true}
    return false
  }
  isTargetted: boolean = false;
  constructor() {
    super()
  }
  build(type:TileBuiltType) {
      this.tileStatus=TileState.taken
      this.tileOccupant=type
  }
  select(){
    this.tileStatus = this.isTaken ? TileState.takenSelected : TileState.freeSelected
  }
}

const getRandomColor = (): [number, number, number] => {
  return [
    Math.random()*255,
    Math.random()*255,
    Math.random()*255
  ]
}

export class Player {
  static objects: Player[] = []
  static getById(id?: string) {
    return id ? Player.objects.find(player => player.id == id) : undefined
  }
  color: [number, number, number] | undefined
  id: string
  constructor(id: string, color?: [number, number, number]) {
    this.id = id
    this.color = color ? color : getRandomColor()
    Player.objects.push(this)
  } 
  setColor(value: [number, number, number]) {
    this.color = value
  }
}