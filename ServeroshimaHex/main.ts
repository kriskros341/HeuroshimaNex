import { Server, Socket } from "socket.io"
import http from "http"
import express from "express"
import cors from "cors"

import { HexaBoard, vec2 } from "../hex_toolkit"
import { negativeResponse, positiveResponse, responseStatus, color, GameHex, Player, TileBuild, buildStructureInterface, response, tileInterface, playerInterface} from "../common"

const app = express()

app.use(cors({
    origin: ['http://83.26.59.107:3000/', "*"],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', "Access-Control-Allow-Private-Network"],
}))

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true
  },
})

class Game {
  board: HexaBoard<GameHex>
  constructor() {
    this.board = new HexaBoard<GameHex>(4, 0, GameHex)
    this.board.build()
  }
  serializePlayers() {
    return Player.objects.map(p => p.serialize())
  }
  buildStructure(playerId: string, tileCoords: vec2, type: TileBuild) {
    const tile = game.board.getTileByCoords(tileCoords)
    if(tile?.tileBuild != TileBuild.free)
      return null
    tile.build(type)
    tile.setOwner(Player.getById(playerId)!)
    const data = {
      type: type, 
      tile: tileCoords, 
      playerId: playerId
    } as buildStructureInterface
    return data
  }
  resetBoard() {
    game.board = new HexaBoard<GameHex>(4, 0, GameHex)
    game.board.build()
  }
  serializeBoard() {
    const boardStatus: tileInterface[] = this.board.hexes.map(hex => hex.serialize())
    return boardStatus
  }
  removePlayer(id: string) {
    Player.getById(id)?.remove()
    game.board.hexes.filter(hex => hex.owner?.id == id).forEach(hex => hex.reset())
  }
}

class NetworkGame extends Game {
  reset(socket: Socket) {
    super.resetBoard()
    socket.broadcast.emit("broad:restart")
    return { status: "OK" }
  }
  disconnectPlayer(socket: Socket) {
    this.removePlayer(socket.id)
    const boardStatus = this.serializeBoard()
    socket.broadcast.emit("broad:board", boardStatus)
    socket.broadcast.emit("broad:remove_player", socket.id)
  }
  build(socket: Socket, tileCoords: vec2, type: TileBuild) : response<buildStructureInterface> {
    const data = super.buildStructure(socket.id, tileCoords, type)
    data && socket.broadcast.emit("broad:build", data)
    return responseFrom(data, "Failed to build structure")
  }
  join(socket: Socket) {
    socket.join("players")
    const player = new Player(socket.id)
    const playerList = this.serializePlayers()
    socket.broadcast.emit("broad:player_list", playerList)
    socket.emit("broad:player_list", playerList)
    return responseFrom({color: player.color})
  }
}

function responseFrom<T>(data: T | null, reason?: string): response<T> {
  if(data) {
    return {status: responseStatus.OK, data: data}
  }
  console.warn(reason)
  return {status: responseStatus.NOPE, reason: reason || "No reason provided"}
}

const game = new NetworkGame()

type callback<T> = (response: response<T>) => void

io.on("connection", async socket => {
  socket.join("sockets")
  console.log("connected!", socket.id)
  socket.on("req:restart", (callback) => {
    console.log("restart game from", socket.id)
    callback(game.reset(socket))
  })
  socket.on("req:create_player", (callback: callback<{color: color}>) => {
    console.log("create player from", socket.id)
    callback(game.join(socket))
  })
  socket.on("req:player_list", (callback: callback<playerInterface[]>) => {
    callback(responseFrom(game.serializePlayers(), "failed to serialize players"))
  })
  socket.on("getBoard", (callback: callback<tileInterface[]>) => {
    console.log("get board state from", socket.id)
    callback(responseFrom(game.serializeBoard(), "failed to serialize board"))
  })
  socket.on("req:build", (tileCoords: vec2, type: TileBuild, callback: callback<buildStructureInterface>) => {
    console.log("build structure from", socket.id)
    callback(game.build(socket, tileCoords, type))
  })
  socket.on("disconnect", () => {
    console.log("dc from", socket.id)
    game.disconnectPlayer(socket)
  })
})

process.on("exit", () => {
  io.to("sockets").emit("broad:restart")
})

console.log("listening")
server.listen(8000)
