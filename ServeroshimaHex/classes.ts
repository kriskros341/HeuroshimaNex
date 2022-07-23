import { responseStatus, color, coords, response, TileInterface, PlayerInterface, negativeResponse, positiveResponse, Stage, TurnMessageInterface} from "../heuroshimanext/common"
import { Server, Socket } from "socket.io"
import {Hex, HexaBoard} from "./hex_toolkit"
import { faker } from "@faker-js/faker"
import { EntityType, TileEntity, UnitList } from "../heuroshimanext/unitTypes"
import { Err, Ok, Result } from "../heuroshimanext/RustlikeTypes"


export const negative = (reason: string) => {
  return {status: responseStatus.NOPE, reason: reason} as negativeResponse
}

export const positive = <T>(data?: T) => {
  return {status: responseStatus.OK, data: data} as positiveResponse<T>
}

export function responseFrom<T>(data: T | null = null, reason: string = "No reason provided"): response<T> {
  if(data) {
    return positive(data)
  }
  console.warn(reason)
  return negative(reason)
}

const getRandomColor = (): [number, number, number] => {
  return [
    Math.floor(Math.random()*255),
    Math.floor(Math.random()*255),
    Math.floor(Math.random()*255)
  ]
}

export class GameHex extends Hex {
  isTargetted: boolean = false;
  isTaken: boolean = false
  owner: Player | null = null
  tileEntity: TileEntity | null = null
  setOwner(player: Player) {
    this.owner = player
  }
  reset() {
    this.tileEntity = null
    this.isTaken = false
    this.owner = null
    this.clearOwner()
  }
  loadState(state: TileInterface) : void {
    this.owner = Player.getById(state.ownerId)
    this.tileEntity = state.tileEntity
    this.isTaken = state.tileEntity == null ? false : true
  }
  serialize() : TileInterface {
    return {
      ownerId: this.owner?.id || null,
      tileEntity: this.tileEntity,
      coords: this.coords
    }
  }
  clearOwner() {
    this.owner = null
  }
  constructor() {
    super()
  }
  build(entity: TileEntity) {
    this.tileEntity = entity
  }
}

export class Player {
  static objects: Player[] = []
  basePlaced: boolean = false
  static getById(id: string | null) {
    const player = Player.objects.find(player => player.id == id)
    return player ? player : null
  }
  hand: EntityType[] = []
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
  serialize() {
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
  usedPlayerMoves: number = 0
  stage: number = 0
  isStarted: boolean = false;

  constructor() {
    this.board = new HexaBoard<GameHex>(2, 0, GameHex)
    this.board.build()
  }
  getCurrentPlayer() {
    return this.players[this.turn % this.players.length]
  }
  nextTurn(): TurnMessageInterface {
    this.turn += 1
    this.usedPlayerMoves = 0
    if(this.turn / this.players.length > 1) {
      this.stage = Stage.proper
    } 
    return {currentStage: this.stage, turnNumber: this.turn}
  }
  incrementMove() {
    this.usedPlayerMoves += 1
  }
  startGame() {
    this.players.forEach(p => p.hand = [EntityType.Base])
    this.isStarted = true
    this.stage = Stage.base_placement
  }
  serializePlayers(): PlayerInterface[] {
    return this.players.map(p => ({...p.serialize(), isTurn: p.id == this.getCurrentPlayer().id}))
  }
  build(playerId: string, tileCoords: coords, type: EntityType): Result<TileInterface, string> {
    const tile = this.board.getTileByCoords(tileCoords)
    if(!tile) {
      return Err("No such tile!")
    }
    if(tile.tileEntity != null)
      return Err("The tile is not free!")
    if(type == EntityType.Base) {
      this.getCurrentPlayer().basePlaced = true
    }
    tile.build(UnitList[type])
    tile.setOwner(Player.getById(playerId)!)
    const data = {
      tileEntity: tile.tileEntity, 
      coords: tileCoords, 
      ownerId: playerId
    }
    this.incrementMove()
    return Ok(data)
  }
  createPlayer(playerId?: string) {
    const player = new Player(playerId || faker.datatype.uuid())
    this.players.push(player)
    return player
  }
  resetBoard() {
    this.board = new HexaBoard<GameHex>(2, 0, GameHex)
    this.board.build()
    this.turn=0
    this.usedPlayerMoves=0
    this.stage = 0
    this.players.forEach(p => p.hand = [])
  }
  serializeBoard() {
    const boardStatus: TileInterface[] = this.board.hexes.map(hex => hex.serialize())
    return boardStatus
  }
  removePlayer(id: string) {
    Player.getById(id)?.remove()
    this.players = this.players.filter(p => p.id != id)
    this.board.hexes.filter(hex => hex.owner?.id == id).forEach(hex => hex.reset())
  }
  validateTurn(id:string) {
    let p = Player.getById(id)
    if(p!=this.getCurrentPlayer()) {
      return false
    }
    return true
  }
  checkForPlayerIssues(id: string) {
    if(!this.isStarted) {
      return "The game is not started!"
    }
    if(!this.players.find(p => p.id == id)) {
      return "Create a player you stupid fuck!"
    }
    if(!this.validateTurn(id)) {
      return "Not your fucking turn bitch!"
    }
    return null
  }
}

/*
  first, I want 
  a client has cards on hand given to them by the server
    what is the best moment to give these?
    after first move lets block players from joining
    

  a base that can and has to be set in first turn
    game has to be altered to include base stage, build stage,
      client doesnt need to know anything about these
    

  unit that shoots 3 rows 
  and obstacle that blocks shoots
*/


