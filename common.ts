import {Hex, vec2} from "./hex_toolkit"

export enum TileBuild{
  free,
  army,
  obstacle,
  base
}

export enum responseStatus {
  OK = "OK",
  NOPE = "NOPE"
}

export interface positiveResponse<T> {
  status: responseStatus.OK
  data: T
}
export interface negativeResponse {
  status: responseStatus
  reason: string
}

export type response<T> = 
  positiveResponse<T> | negativeResponse


export interface tileInterface {
  ownerId: string | null
  buildType: TileBuild
}

export interface buildStructureInterface {
  tile: vec2
  type: TileBuild
  playerId: string
}

export interface playerInterface {
  id: string,
  color: [number, number, number] | null
}

export type color = [number, number, number] | null

export class GameHex extends Hex {
  isTaken: boolean = false
  tileBuild:TileBuild=TileBuild.free
  owner: Player | null = null
  setOwner(player: Player) {
    this.owner = player
  }
  reset() {
    this.tileBuild = TileBuild.free
    this.isTaken = false
    this.owner = null
    this.clearOwner()
  }
  loadState(state: tileInterface) : void {
    this.owner = Player.getById(state.ownerId)
    this.tileBuild = state.buildType
    this.isTaken = state.buildType == TileBuild.free ? false : true
  }
  serialize() : tileInterface {
    return {
      ownerId: this.owner?.id || null,
      buildType: this.tileBuild
    }
  }
  clearOwner() {
    this.owner = null
  }
  isTargetted: boolean = false;
  constructor() {
    super()
  }
  build(type:TileBuild) {
      this.tileBuild=type
  }
}

const getRandomColor = (): [number, number, number] => {
  return [
    Math.random()*255,
    Math.random()*255,
    Math.random()*255
  ]
}

const tempDefaultColor: [number, number, number] = [100, 100, 100]

export class Player {
  static objects: Player[] = []
  static getById(id: string | null) {
    const player = Player.objects.find(player => player.id == id)
    return player ? player : null
  }
  color: color
  id: string
  constructor(id: string, color: color = null) {
    this.id = id
    this.color = color ? color : getRandomColor()
    Player.objects.push(this)
  } 
  setColor(value: [number, number, number]) {
    this.color = value
  }
  serialize(): playerInterface {
    return {id: this.id, color: this.color}
  }
  remove() {
    Player.objects = Player.objects.filter(p => p.id != this.id)
  }
}


class Game {
  turn: number = 0
  movingPlayer: number = 0
  players: Player[] = []
  constructor() {
  }

}