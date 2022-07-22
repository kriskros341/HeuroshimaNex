import { Server, Socket } from "socket.io"
import http from "http"
import express from "express"
import cors from "cors"
import { responseStatus, color, LobbyInterface, coords, TileBuild, response, TileInterface, playerInterface, negativeResponse, positiveResponse} from "../heuroshimanext/common"
import { responseFrom, NetworkGame } from "./classes"
import {faker} from "@faker-js/faker"

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

const game = new NetworkGame()

type callback<T> = (response: response<T>) => void

const gameMap = new Map<string, NetworkGame>()


const createTestPlayer = () => {
  return {
    id: faker.datatype.uuid(),
    userName: faker.internet.userName(),
    color: faker.color.rgb()
  }
}

const createTestLobby = () => {
  const userCount = Math.floor(Math.random() * 6)
  return {
    id: faker.datatype.uuid(),
    players: Array.from({length: userCount}).map(v => createTestPlayer()),
    maxPlayers: faker.datatype.number()
  }
}


const lobbies: LobbyInterface[] =
  Array.from({length: 6}).map(() => createTestLobby())

io.on("connection", async socket => {
  //lobby
  socket.join("sockets")
  socket.on("join_global_lobby", (callback: callback<LobbyInterface[]>) => {
    socket.join("global_lobby")
    callback(responseFrom(lobbies))
  })

  //game
  console.log("connected!", socket.id)
  socket.on("req:start_game", () => {
    console.log("started by", socket.id)
    game.start(socket)
    io.emit("broad:start_game")
  })
  socket.on("req:restart", (callback) => {
    console.log("restart game from", socket.id)
    callback(game.reset(socket))
  })
  socket.on("req:create_player", (callback: callback<{color: color}>) => {
    console.log("create player from", socket.id)
    callback(game.join(socket))
  })
  socket.on("req:turn", (callback) => {
    console.log("Requesting turn number...")
    console.log("Turn:")
    callback(game.broadNextTurn(socket))
  })

  socket.on("req:player_list", (callback: callback<playerInterface[]>) => {
    console.log(game.serializePlayers())
    callback(responseFrom(game.serializePlayers(), "failed to serialize players"))
  })
  socket.on("getBoard", (callback: callback<TileInterface[]>) => {
    console.log("get board state from", socket.id)
    callback(responseFrom(game.serializeBoard(), "failed to serialize board"))
  })
  socket.on("req:build", (tileCoords: coords, type: TileBuild, callback: callback<TileInterface>) => {
    console.log("build structure from", socket.id, "on", tileCoords, "type: ", type)
    callback(game.build(socket, tileCoords, type))
  })
  socket.on("disconnect", () => {
    console.log("dc from", socket.id)
    game.disconnectPlayer(socket)
    game.players.length == 0 && game.resetBoard()
  })
  socket.on("test", () => {
    console.log("test from", socket.id)
    socket.emit("test")
  })
})

process.on("exit", () => {
  io.to("sockets").emit("broad:restart")
})

console.log("listening")
server.listen(8000)
