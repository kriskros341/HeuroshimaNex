import type { NextPage } from 'next'
import dynamic from "next/dynamic"
import Head from 'next/head'
import Image from 'next/image'
import { useContext, useEffect, useState } from 'react'
import styles from '../styles/Home.module.css'
import guiStyles from '../styles/Gui.module.css'
import {response, color, playerInterface, TileInterface, TileBuild} from "../common"
import { io, Socket } from 'socket.io-client'
import { PlayerContext, ConnectionContext, unwrap, Config } from '../components/Contexts'

const Game = dynamic(() => import("../components/Game/Game"), {
  ssr: false,
  loading: () => <div className={styles.loadingStyle}>LOADING</div>
})

const TurnCounter: React.FC<{}> = () =>{
  return(
    <b>Turn:<span></span></b>
  )
}

const GamerList:React.FC<{turn: number, players: playerInterface[]}>=({turn, players})=> {
  const {thisPlayer} = useContext(PlayerContext)
  return(
      <div>
    gamers:
      {players.map((p, idx) => {
        if(p.id == thisPlayer?.id) {
          return
        }
        const isTurn = p.id == players[turn % players.length].id
        return <li 
          key={`listed_${p.id}${idx}`}
          style={{color: isTurn ? "green" : "white"}}
        >{p.id}
        <span style={{backgroundColor: `rgba(${p.color![0]}, ${p.color![1]}, ${p.color![2]})`}} className={guiStyles.colorIndicator}></span>
        </li>
      }
      )}
    </div>
  )
}

const map = new Map<TileBuild,string>();
map.set(TileBuild.free,"Free")
map.set(TileBuild.army,"Army")
map.set(TileBuild.obstacle,"Obstacle")
map.set(TileBuild.base,"Base")


const Stats: React.FC<{selectedTile:TileInterface}>=({selectedTile})=> {
  return(
    <div className="hidden">
      Tile selected: {selectedTile.coords.x}, {selectedTile.coords.y}<br />
      current state: <span id="tileStatus">{map.get(selectedTile.buildType)}</span><br />
      owner: <span>{selectedTile.ownerId}</span><br />
    </div> 
  )
}

const Builder: React.FC<{selectedTile: TileInterface}>=({selectedTile})=> {
  const connection = useContext(ConnectionContext)
  const build = (type: TileBuild) => {
    connection?.emit("req:build", selectedTile.coords, type, (data: response<TileInterface>) => {
      unwrap(data)
    })
  }
  return(
    <div className="hidden" >
      Pick a structure to build: <br />
      <ul>
        <li><button onClick={() => build(TileBuild.army)} >Army Unit</button></li>
        <li><button onClick={() => build(TileBuild.obstacle)} >Obstacle</button></li>
        <li><button onClick={() => build(TileBuild.base)}>Main Base</button></li>
      </ul>
    </div>
  )
}

const MyButton: React.FC<{fun: () => void, children: string}>=({fun, children})=> {
  return(
    <button onClick={() => fun()}>{children}</button>
  )
}

const translateColor = (c: [number, number, number]) => {
  return c[0]*256 + c[1]*16 + c[2]
}

const GUI: React.FC<{v:TileInterface|null}> = ({v}) => {
  const connection = useContext(ConnectionContext)
  const {thisPlayer, setPlayer, refreshPlayerList, players, config} = useContext(PlayerContext)
  const [turn, setTurn] = useState(0)
  const handleRestart = (response: response<{}>) => {
    const c = unwrap(response)
    c && refreshPlayerList()
  }
  const handleJoin = (resp: response<{color: color}>) => {
    const response = unwrap(resp)
    response && setPlayer({id: connection!.id, color: response.color})
  }
  const handleNextTurn = (resp:response<{turnNumber: number}>)=>{
    console.log(resp)
    const response = unwrap(resp)
    console.log(response)
    response && setTurn(response.turnNumber)
  }
  const broadSetTurn = (n: number) => {
    setTurn(n)
  }
  useEffect(() => {
    connection?.on("broad:turn", broadSetTurn)
    return () => {
      connection?.removeListener("broad:turn", broadSetTurn)
    }
  }, [connection])
  const join = () => connection?.emit("req:create_player", handleJoin)
  const restart = () => connection?.emit("req:restart", handleRestart)
  const next_turn = () =>{
    console.log("Requested next turn")
    connection?.emit("req:turn", handleNextTurn)
  }
  const isMyMove = thisPlayer && players[turn % players.length]?.id == thisPlayer.id
  return (
    <>
      <div className={guiStyles.gui}>
        <div id="mainGui">GUIII<br />
        <b>Turn: {turn}</b><br />
        {thisPlayer ? 
          <span 
            style={{color: isMyMove ? "green" : "white"}}
          >Player ID: {thisPlayer?.id} <span style={{backgroundColor: `rgba(${thisPlayer.color![0]}, ${thisPlayer.color![1]}, ${thisPlayer.color![2]})`}} className={guiStyles.colorIndicator}></span></span>
          :
          <MyButton fun={join}>join</MyButton>
        }
        {players.length > 1 ? 
          <GamerList turn={turn} players={players}/>
          :
          <div>you are alone.</div>
        }
        <MyButton fun={restart}>restart</MyButton>
        <MyButton fun={refreshPlayerList}>Debug</MyButton>
        <MyButton fun={next_turn}>Next Turn</MyButton>
      </div>
        {v && <Stats selectedTile={v} />}
        {thisPlayer && v && config.selectMode == 1 && <Builder selectedTile={v} />}
      </div>
    </>
  )
}

const useSocket = (url: string, cleanup?: () => void) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    const current = io(url)
    setSocket(current)
    return () => {
      socket?.disconnect()
    }
  }, [])
  return socket
}

const Home: NextPage = () => {
  const [selected, setSelected]=useState<TileInterface | null>(null)
  const [player, setPlayer] = useState<playerInterface | null>(null)
  const [config, setConfig] = useState<Config>({selectMode: 0})
  const [players, setPlayers] = useState<playerInterface[]>([])
  const connection = useSocket("http://heuroshimanex.ddns.net:8000/")
  const handlePlayerList = (response: response<playerInterface[]>) => {
    const data = unwrap(response)
    data && setPlayers(data)
    if(!players.map(p => p.id).includes(player?.id || "")) {
      setPlayer(null)
    }
  }
  const refreshPlayerList = () => {
    connection && connection.emit("req:player_list", (d: response<playerInterface[]>) => handlePlayerList(d))
  }
  useEffect(() => {
    const onConnect = () => console.log("connected!")
    if(connection) {
      connection.on("connect", onConnect)
      connection.on("broad:player_list", setPlayers)
      refreshPlayerList()
    }
    return () => {
      connection?.removeListener("connect", onConnect)
      connection?.removeListener("broad:player_list", setPlayers)
    }
  }, [connection])
  const playerContext = {
    thisPlayer: player, 
    config: config,
    setSelectMode:(n: number) => setConfig(v => ({...v, selectMode: n})),
    setPlayer: (p: playerInterface) => setPlayer(p), 
    players: players,
    refreshPlayerList: refreshPlayerList
  }
  return (
    <div className={styles.container}>
      <Head>
        <title>HeuroshimaNext v.0.1</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ConnectionContext.Provider value={connection}>
        {connection && 
          <Game 
            connection={connection} 
            pickHex={(v: TileInterface | null) => setSelected(v)} 
            playerContext={playerContext!} 
          />
        }
        <PlayerContext.Provider value={playerContext!}>
          <GUI v={selected} />
        </PlayerContext.Provider>
      </ConnectionContext.Provider>
    </div>
  )
}

/*
  TODO:
  talia kart
  - lista graczy
        -> kółko z kolorem gracza
        -> zaznaczenie naszej nazwy
    Next Targets:
      - Tury
        ->gracz turowy może klikać, nikt inny (done)
        -. gracz turowy jest zaznaczony jakoś
        -> Turn counter jest widoczny
      - Guziki roziwjają Menu z większą ilością wyborów (3 różne jednostki armii, itp.)
      - jakieś zasoby dla gracza aby był limit postawień rzeczy
      - dalsza logika
      - przeczytać wreszcie zasady gry XD

*/

export default Home
