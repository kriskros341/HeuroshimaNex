import { Server } from "socket.io"
import http from "http"
import express from "express"
import cors from "cors"

import { Hex, HexaBoard, vec2 } from "../hex_toolkit"
import { GameHex, Player, TileBuild, buildStructureInterface, response, tileInterface} from "../common"

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

class InteractiveHex extends GameHex {
  static objects: InteractiveHex[] = []
  constructor() {
    super()
    InteractiveHex.objects.push(this)
  }
}

let hb = new HexaBoard<InteractiveHex>(4, 0, InteractiveHex)
hb.build()

const getBoardStatus = () => {
  return hb.hexes.map((hex) => hex.tileBuild == TileBuild.free)
}

io.on("connection", socket => {
  socket.join("sockets")
  console.log("connected!", socket.id)
  socket.on("req:restart", (callback) => {
    InteractiveHex.objects = InteractiveHex.objects.filter(h => !hb.hexes.includes(h))
    hb = new HexaBoard<InteractiveHex>(4, 0, InteractiveHex)
    hb.build()
    io.to("sockets").emit("broad:restart")
    callback({status: "OK"})
  })
  socket.on("req:create_player", (callback) => {
    console.log("join")
    socket.join("players")
    for(let p of Player.objects) {
      socket.emit("resp:create_player", p)
    }
    const player = new Player(socket.id)
    socket.to("players").except(socket.id).emit("broad:create_player", player)
    callback({status: "OK", color: player.color})
  })
  socket.on("getBoard", (callback: (data: response<tileInterface[]>) => void) => {
    const boardStatus: tileInterface[] = hb.hexes.map(hex => hex.serialize())
    callback({status: "OK", data: boardStatus})
  })
  socket.on("req:build", (tileCoords: vec2, type: TileBuild, callback: (o: response<buildStructureInterface>) => void) => {
    const tile = hb.getTileByCoords(tileCoords)
    if(!tile) {
      callback({status: "NOPE"})
      return
    }
    if(tile.tileBuild != TileBuild.free) {
      callback({status: "NOPE"})
      return
    }
    tile.build(type)
    tile.setOwner(Player.getById(socket.id)!)
    io.to("sockets")
      .emit(
        "broad:build", 
        {
          type: type, 
          tile: tileCoords, 
          playerId: socket.id
        } as buildStructureInterface
      )
    callback(
      {
        status: "OK", 
        data: {
          type: type, 
          tile: tileCoords, 
          playerId: socket.id
        }
      } as response<buildStructureInterface>
    )
  })
  socket.on("disconnect", () => {
    console.log(socket.id, "got dcd!")
    Player.objects = Player.objects.filter(p => p.id != socket.id)
    hb.hexes.filter(hex => hex.owner?.id == socket.id).forEach(hex => hex.reset())
    const boardStatus: tileInterface[] = hb.hexes.map(hex => hex.serialize())
    io.to("sockets").emit("broad:board", boardStatus)
    io.to("sockets").emit("broad:remove_player", socket.id)
  })
})

console.log("listening")
server.listen(8000)

