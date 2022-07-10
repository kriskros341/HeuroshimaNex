import { Server } from "socket.io"
import http from "http"
import express from "express"
import cors from "cors"

import { Hex, HexaBoard, vec2 } from "../hex_toolkit"
import { GameHex } from "../common"

const app = express()

app.use(cors({
    origin: ['http://83.26.47.58:3000/', "*"],
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




io.on("connection", socket => {
  socket.join("sockets")

  console.log("connected!")
  socket.on("req:restart", (callback) => {
    hb = new HexaBoard<InteractiveHex>(4, 0, InteractiveHex)
    hb.build()
    callback({status: "OK"})
  })
  socket.on("req:tileSelect", (tileCoords: vec2, callback: (o: any) => void) => {
    const hex = hb.getTileByCoords(tileCoords)
    if(!hex) {
      callback({status: "NOPE", data: "tile doesn't exist!"})
      return
    }
    if(hex.isTaken) {
      callback({status: "NOPE", data: "tile already taken!"})
      return
    }
    hex.take()
    callback({status: "OK"})
  })
})

console.log("listening")
server.listen(8000)

