import { Event, Server, Socket } from "socket.io"
import http from "http"
import express from "express"
import cors from "cors"
import { responseStatus, color, LobbyInterface, coords, response, TileInterface, PlayerInterface, negativeResponse, positiveResponse, GameOptions, TurnMessageInterface} from "../heuroshimanext/common"
import { responseFrom, Game, positive, negative, Player } from "./classes"
import {faker} from "@faker-js/faker"
import { EntityType, TileEntity, direction } from "../heuroshimanext/unitTypes"
import { Ok, Err, Result } from "../heuroshimanext/RustlikeTypes"

type callback<T> = (response: response<T>) => void




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


class NetworkGameRouter {
  games = new Map<string, NetworkGameFacade>()
  remove(gameId: string) {
    this.games.delete(gameId)
  }
  new() {
    const game = new NetworkGameFacade()
    this.games.set(game.id, game)
    return game
  }
  get(gameId: string) {
    return this.games.get(gameId)
  }
  clear() {
    this.games = new Map<string, NetworkGameFacade>()
  }
}

const gameRouter = new NetworkGameRouter()


//it is responsible for communication between sockets and game
class NetworkGameFacade {
  game: Game
  id: string
  constructor() {
    this.id = faker.datatype.uuid()
    this.game = new Game()
  }
  start() {
    this.game.startGame()
  }
  getPlayerById(id: string) {
    return this.game.players.find(p => p.id == id)
  }
  serializeGame() {
    return {
      id: this.id,
      stage: this.game.stage,
    } as GameOptions
  }
  serializePlayers() {
    return this.game.serializePlayers()
  }
  serializeBoard() {
    return this.game.serializeBoard()
  }
  nextTurn(socket: MySocket): Result<TurnMessageInterface, string> {
    if(!this.getPlayerById(socket.id)) {
      return Err("create a player!")
    }
    if(this.getPlayerById(socket.id) != this.game.getCurrentPlayer()) {
      return Err("not your turn")
    }
    const turnData = this.game.nextTurn()
    return Ok(turnData)
  }
  join(socket: Socket) {
    socket.join("players")
    const player= this.game.createPlayer(socket.id)
    return responseFrom({color: player.color})
  }
  //unused
  rotateEntity(socket: Socket, coords: coords, direction: direction): Result<{}, string> {
    const tile = this.game.board.getTileByCoords(coords)
    if(!tile) {
      return Err("rotation: no such tile");
    }
    if(!tile.tileEntity) {
      return Err("rotation: no entity on tile");
    }
    if(tile.owner?.id != socket.id) {
      return Err("rotation: you dont own this entity dumbfucrk");
    } 
    tile.tileEntity.rotation = direction
    return Ok({})
  }
  build(socket: Socket, tileCoords: coords, type: EntityType): Result<TileInterface, string> {
    const issues = this.game.checkForPlayerIssues(socket.id)
    if(issues)
      return Err(issues)
    if(this.game.usedPlayerMoves >= 2)
      return Err("ran out of moves!")
    const player = this.game.getCurrentPlayer()
    if(!player.basePlaced) {
      if(type != EntityType.Base)
        return Err("must place base first!")
    } else {
      if(type == EntityType.Base) {
        return Err("You may only have one base!")
      }
    }
    player.basePlaced = true
    const result = this.game.build(socket.id, tileCoords, type)
    if(result._tag == "Err") {
      return Err(result.err)
    }
    return Ok(result.ok!)
  }
  reset(socket: Socket) {
    this.game.resetBoard()
    socket.broadcast.emit("broad:restart")
    socket.emit("broad:restart")
    return { status: "OK" }
  }
  disconnectPlayer(socket: Socket) {
    this.game.removePlayer(socket.id)
  }
  getPlayers() {
    return this.game.players
  }
}

const app = express()

app.use(cors())

app.get("/create_game", (req, res) => {
  const game = gameRouter.new()
  res.send({gameId: game.id})
})

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true
  },
})

interface MySocket extends Socket {
  game?: NetworkGameFacade

}

const gameNamespace = io.of("/game")

type socketMiddleware = ([endpoint, ...args]: Event, next: (err?: Error) => any) => any

gameNamespace.on("connection", async (socket: MySocket) => {
  socket.use(([endpoint, ...args], next) => {
    const exclude = [
      "req:subscribe",
    ]
    if(socket.game || exclude.includes(endpoint))
      next()
    next(new Error("The game doesn't exist!"))
  })
  socket.use(([endpoint, ...args], next) => {
    console.log(`game request on ${endpoint} from ${socket.game?.id}/${socket.id}`)
    next()
  })
  socket.on("error", (err) => {
    //console.log(err.message, "from", socket.id)
    //dev server creates additional socket so no disconnects plz.
  })
  socket.on("req:subscribe", (gameId: string, callback: callback<{}>) => {
    const gameFacade = gameRouter.get(gameId)
    if(!gameFacade) {
      return callback(negative("the game doesn't exist!"))
    }
    if(gameFacade.game.isStarted) {
      return negative("The game has already started!")
    }
    socket.join(gameId)
    socket.game = gameFacade
    console.log(`${socket.id} joined ${gameId}`)
    callback(responseFrom(gameFacade.serializeGame()))
  })
  socket.on("req:start_game", (callback: callback<{}>) => {
    socket.game!.start()
    gameNamespace.to(socket.game!.id).emit("broad:start_game")
    callback(responseFrom({}))
  })
  socket.on("get_board", (callback: callback<TileInterface[]>) => {
    const board = gameRouter.get(socket.game?.id || "")?.serializeBoard()
    callback(responseFrom(board, "failed to serialize board"))
  })
  socket.on("sync_board", () => {
    const board = socket.game?.serializeBoard()
    gameNamespace.to(socket.game!.id).emit("broad:board", board)
  })
  socket.on("sync_players", () => {
    const players = socket.game!.serializePlayers()
    gameNamespace.to(socket.game!.id).emit("broad:sync_players", players)
  })
  socket.on("req:create_player", (callback: callback<{color: color}>) => {
    if(socket.game!.getPlayerById(socket.id)) {
      return callback(negative("player already exists"))
    }
    const player = socket.game!.join(socket)
    const players = socket.game!.game.serializePlayers()
    gameNamespace.to(socket.game!.id).emit("broad:sync_players", players)
    callback(player)
  })
  socket.on("req:build", (tileCoords: coords, type: EntityType, rotation: direction, callback: callback<TileInterface>) => {
    const data = socket.game!.build(socket, tileCoords, type)
    if(data._tag == "Err")
      return callback(negative(data.err))
    gameNamespace.to(socket.game!.id).emit("broad:build", data.ok)
    callback(positive())
  })
  socket.on("req:rotate", (tileCoords, rotation, callback: callback<{}>) => {
    const tile = socket.game!.game.board.getTileByCoords(tileCoords)
    if(!tile) {
      return
    }
    if(!tile.tileEntity) {
      return
    }
    if(tile.owner?.id != socket.id) {
      return
    }
    tile.tileEntity.rotation = rotation

    const board = socket.game?.serializeBoard()
    gameNamespace.to(socket.game!.id).emit("broad:rotate", board)
  })
  socket.on("req:turn", (callback: callback<{}>) => {
    const result = socket.game!.nextTurn(socket)
    if(result._tag == "Err") {
      return negative(result.err)
    }
    const toBeSent = {
      currentStage: socket.game!.game.stage,
      turnNumber: socket.game!.game.turn
    }
    const players = socket.game!.serializePlayers()
    gameNamespace.to(socket.game!.id).emit("broad:turn", toBeSent)
    gameNamespace.to(socket.game!.id).emit("broad:sync_players", players)
    return callback(responseFrom({}))
  })
  socket.on("disconnect", () => {
    if(!socket.game) {
      return
    } //needed??
    socket.game.disconnectPlayer(socket)
    if(socket.game.getPlayers().length == 0) {
      return gameRouter.remove("game")
    }
    const players = socket.game.game.serializePlayers()
    gameNamespace.to(socket.game.id).emit("broad:sync_players", players)
    const board = socket.game.serializeBoard()
    gameNamespace.to(socket.game.id).emit("broad:sync_board", board)
  })
})


io.of("/game_list").on("connection", async socket => {
  socket.on("req:subscribe", (callback: callback<{}>) => {
    socket.join("global_lobby")
    callback(responseFrom({}))

  })
})

process.on("exit", () => {
  io.to("sockets").emit("broad:restart")
})

console.log("listening")
server.listen(8000)
