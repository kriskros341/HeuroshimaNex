import { Server } from "socket.io"
import http from "http"
import express from "express"
import cors from "cors"

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

io.on("connection", socket => {
  socket.join("sockets")
  console.log("connected!")
  socket.on("test", () => {
    socket.emit("resp:test")
  })
  socket.on("test", () => {
    console.log("test")
  })
})

console.log("listening")
server.listen(8000)

