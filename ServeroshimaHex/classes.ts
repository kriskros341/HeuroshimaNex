import { responseStatus, color, coords, TileBuild, response, TileInterface, playerInterface, negativeResponse, positiveResponse} from "../heuroshimanext/common"
import { Server, Socket } from "socket.io"
import {Hex, HexaBoard} from "./hex_toolkit"
import { faker } from "@faker-js/faker"


export const negative = (reason: string) => {
  return {status: responseStatus.NOPE, reason: reason} as negativeResponse
}

export function responseFrom<T>(data: T | null = null, reason: string = "No reason provided"): response<T> {
  if(data) {
    return {status: responseStatus.OK, data: data} as positiveResponse<T>
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
  loadState(state: TileInterface) : void {
    this.owner = Player.getById(state.ownerId)
    this.tileBuild = state.buildType
    this.isTaken = state.buildType == TileBuild.free ? false : true
  }
  serialize() : TileInterface {
    return {
      ownerId: this.owner?.id || null,
      buildType: this.tileBuild,
      coords: this.coords
    }
  }
  clearOwner() {
    this.owner = null
  }
  constructor() {
    super()
  }
  build(type:TileBuild) {
      this.tileBuild=type
  }
}

export class Player {
  static objects: Player[] = []
  static getById(id: string | null) {
    const player = Player.objects.find(player => player.id == id)
    return player ? player : null
  }
  hand: TileBuild[] = []
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
  usedPlayerMoves: number = 0
  stage: number = 0
  isStarted: boolean = false;

  constructor() {
    this.board = new HexaBoard<GameHex>(4, 0, GameHex)
    this.board.build()
  }
  getCurrentPlayer() {
    return this.players[this.turn % this.players.length]
  }
  nextTurn() {
    this.turn += 1
    this.usedPlayerMoves = 0
    if(this.turn / this.players.length > 1) {
      this.stage = 1
    } 

  }
  incrementMove() {
    this.usedPlayerMoves += 1
  }
  startGame() {
    this.players.forEach(p => p.hand = [TileBuild.base])
    this.isStarted = true
  }
  serializePlayers() {
    return this.players.map(p => p.serialize())
  }
  build(playerId: string, tileCoords: coords, type: TileBuild): [TileInterface | null, string] {
    const tile = this.board.getTileByCoords(tileCoords)
    if(tile?.tileBuild != TileBuild.free)
      return [null, "The tile is not free!"]
    tile.build(type)
    tile.setOwner(Player.getById(playerId)!)
    const data = {
      buildType: type, 
      coords: tileCoords, 
      ownerId: playerId
    } as TileInterface
    this.incrementMove()
    return [data, "nothing wrong here"]
  }
  createPlayer(playerId?: string) {
    const player = new Player(playerId || faker.datatype.uuid())
    this.players.push(player)
    return player
  }
  resetBoard() {
    this.board = new HexaBoard<GameHex>(4, 0, GameHex)
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

export class NetworkGame extends Game {
  buildStructure(socket: Socket, tileCoords: coords, type: TileBuild) : response<TileInterface> {
    const issue = this.checkForPlayerIssues(socket.id)
    if(issue)
      return negative(issue)
    if(this.usedPlayerMoves >= 2) {
      return negative("You ran out of moves dumbfuck!")
    }
    const [data, error] = super.build(socket.id, tileCoords, type)
    data && socket.broadcast.emit("broad:build", data)
    data && socket.emit("broad:build", data)
    return responseFrom(data, error)
  }
  constructor() {
    super()
  }
  start(socket: Socket) {
    super.startGame()
  }
  broadNextTurn(socket: Socket) {
    if(!Player.getById(socket.id)) {
      return negative("Create player you stupid fuck")
    }
    if(Player.getById(socket.id) != this.getCurrentPlayer()) {
      return negative("Not your fucking turn bitch!")
    }
    this.nextTurn()
    const toBeSent = {turnNumber: this.turn}
    socket.broadcast.emit("broad:turn", toBeSent.turnNumber)
    return responseFrom(toBeSent)
  }
  reset(socket: Socket) {
    super.resetBoard()
    socket.broadcast.emit("broad:restart")
    socket.emit("broad:restart")
    return { status: "OK" }
  }
  synchState(socket: Socket) {
    const boardStatus = this.serializeBoard()
    const playerList = this.serializePlayers()
    socket.broadcast.emit("broad:player_list", playerList)
    socket.broadcast.emit("broad:board", boardStatus)
  }
  disconnectPlayer(socket: Socket) {
    this.removePlayer(socket.id)
    this.synchState(socket)
  }
  join(socket: Socket) {
    if(this.isStarted) {
      return negative("The game has already started!")
    }
    const player = super.createPlayer(socket.id)
    const playerList = this.serializePlayers()
    socket.broadcast.emit("broad:player_list", playerList)
    socket.emit("broad:player_list", playerList)
    return responseFrom({color: player.color})
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


