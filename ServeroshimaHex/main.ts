import { Server, Socket } from "socket.io"
import http from "http"
import express from "express"
import cors from "cors"
import { responseStatus, color, coords, TileBuild, response, TileInterface, playerInterface, negativeResponse, positiveResponse} from "../heuroshimanext/common"
import { responseFrom, NetworkGame } from "./classes"
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
