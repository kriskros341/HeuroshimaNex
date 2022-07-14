import {Hex, vec2, HexaBoard} from "./hex_toolkit"

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


export class Game {
  players: Player[] = []
  board: HexaBoard<GameHex>
  turn: number = 0
  constructor() {
    this.board = new HexaBoard<GameHex>(4, 0, GameHex)
    this.board.build()
  }
  getCurrentPlayer() {
    return this.players[this.turn % this.players.length]
  }
  nextTurn() {
    this.turn += 1
  }
  serializePlayers() {
    return this.players.map(p => p.serialize())
  }
  buildStructure(playerId: string, tileCoords: vec2, type: TileBuild) {
    const tile = this.board.getTileByCoords(tileCoords)
    if(tile?.tileBuild != TileBuild.free)
      return null
    tile.build(type)
    tile.setOwner(Player.getById(playerId)!)
    const data = {
      type: type, 
      tile: tileCoords, 
      playerId: playerId
    } as buildStructureInterface
    this.nextTurn()
    return data
  }
  joinGame(p: Player) {
    this.players.push(p)
  }
  resetBoard() {
    this.board = new HexaBoard<GameHex>(4, 0, GameHex)
    this.board.build()
  }
  serializeBoard() {
    const boardStatus: tileInterface[] = this.board.hexes.map(hex => hex.serialize())
    return boardStatus
  }
  removePlayer(id: string) {
    Player.getById(id)?.remove()
    this.players = this.players.filter(p => p.id != id)
    this.board.hexes.filter(hex => hex.owner?.id == id).forEach(hex => hex.reset())
  }
  validateTurn(id:string){
    let p = Player.getById(id)
    if(p==this.getCurrentPlayer())
    {return true}
    return false
  }
}