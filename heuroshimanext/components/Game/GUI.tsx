import Image from 'next/image'
import React, { FC, useContext, useEffect, useState } from 'react'
import styles from '../../styles/Gui.module.css'
import {response, color, PlayerInterface, TileInterface, SelectedTileUnit} from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from '../Contexts'
import { Socket } from 'socket.io-client'
import { EntityType, TileEntity } from '../../unitTypes'

const TurnCounter: React.FC<{}> = () =>{
  return(
    <b>Turn:<span></span></b>
  )
}




const GamerList:React.FC<{showIf: boolean, turn: number, players: PlayerInterface[]}>=({showIf, turn, players})=> {
  const {thisPlayer} = useContext(PlayerContext)
  if(!showIf) {
    return <div>you are alone.</div>
  }
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
        <span style={{backgroundColor: `rgba(${p.color![0]}, ${p.color![1]}, ${p.color![2]})`}} className={styles.colorIndicator}></span>
        </li>
      }
      )}
    </div>
  )
}


const Stats: React.FC<{selectedTile:TileInterface}>=({selectedTile})=> {
  return(
    <div className="hidden">
      Tile selected: {selectedTile.coords.x}, {selectedTile.coords.y}<br />
      current state: <span id="tileStatus">{selectedTile.tileEntity?.type || "Free"}</span><br />
      owner: <span>{selectedTile.ownerId}</span><br />
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

const PlayerIndicator: FC<{isMyMove: boolean}> = ({isMyMove}) => {
  const connection = useContext(ConnectionContext)
  const { thisPlayer, refreshPlayerList } = useContext(PlayerContext)
  const handleCreate = (resp: response<{color: color}>) => {
    const response = unwrap(resp)
    response && refreshPlayerList()
  }
  const join = () => connection?.emit("req:create_player", handleCreate)
  if(!thisPlayer) {
    return <MyButton fun={join}>join</MyButton>
  }
  return (
    <span style={{color: isMyMove ? "green" : "white"}}>
      Player ID: {thisPlayer?.id} 
      <span 
        style={{backgroundColor: `rgba(${thisPlayer.color![0]}, ${thisPlayer.color![1]}, ${thisPlayer.color![2]})`}} 
        className={styles.colorIndicator} 
      />
    </span>
  )
}

const ButtonList = () => {

}

const GUI: React.FC<{selectedTile:SelectedTileUnit|null}> = ({selectedTile}) => {
  const connection = useContext(ConnectionContext)
  const {thisPlayer, refreshPlayerList, players} = useContext(PlayerContext)
  const [turn, setTurn] = useState(0)
  const handleRestart = (response: response<{}>) => {
    const c = unwrap(response)
    c && refreshPlayerList()
  }
  const handleNextTurn = (resp:response<{}>)=>{
    const response = unwrap(resp)
  }
  const handleTurnBroadcast = ({currentPlayer, turnNumber}: {currentPlayer: string, turnNumber: number}) => {
    setTurn(turnNumber)
  }
  const [isStarted, setStarted] = useState(false)
  const broadStart = () => {
    setStarted(true)
  }
  const requestStartGame = (response: response<{}>) => {
    unwrap(response)
  }
  const handleStartBtn = () => connection?.emit("req:start_game", requestStartGame)
  useEffect(() => {
    connection?.on("test", () => console.log("test!"))
    connection?.on("broad:turn", handleTurnBroadcast)
    connection?.on("broad:start_game", broadStart)
    console.log(connection?.listeners("broad:start_game"))
    return () => {
      connection?.off("broad:turn", handleTurnBroadcast)
      connection?.off("broad:start_game", broadStart)
    }
  }, [connection])
  const restart = () => connection?.emit("req:restart", handleRestart)
  const next_turn = () =>{
    console.log("Requested next turn")
    connection?.emit("req:turn", handleNextTurn)
  }
  const isMyMove = thisPlayer?.isTurn || false
  return (
    <div className={styles.guiContainer}>
      <div className={styles.gui}>
        <div id="mainGui">GUIII<br />
        <b>Turn: {turn}</b><br />
        <PlayerIndicator isMyMove={!!isMyMove}/>
        <GamerList showIf={players.length > 0} turn={turn} players={players}/>
        {
          isStarted ? (
            <>
              <MyButton fun={restart}>restart</MyButton>
              <MyButton fun={next_turn}>Next Turn</MyButton>
            </>
          ) : (
            <MyButton fun={handleStartBtn}>Start</MyButton>
          )
        }
      </div>
        {selectedTile && <Stats selectedTile={selectedTile} />}
      </div>
      <Hand connection={connection} selectedTile={selectedTile}/>
    </div>
  )
}
const Hand: React.FC<{connection: Socket | null, selectedTile: SelectedTileUnit | null}> = ({selectedTile, connection}) => {
  const build = (type: EntityType) => {
    connection?.emit("req:build", selectedTile?.coords, type, selectedTile?.rotation, (data: response<TileInterface>) => {
      unwrap(data)
    })
  }
  return (
    <div className={styles.hand}>
      <Deque isActive={!!selectedTile}>
        <Card onClick={() => build(EntityType.Solider)}>Solider</Card>
        <Card onClick={() => build(EntityType.Barricade)}>Barricade</Card>
        <Card onClick={() => build(EntityType.Knight)}>Knight</Card>
        <Card onClick={() => build(EntityType.Base)}>Base</Card>
      </Deque>
    </div>
  )
}

const Card: React.FC<{onClick: () => void, children: string}> = ({onClick, children}) => {
  return (
    <div onClick={onClick} className={styles.card}>
      {children}
    </div>
  )
}

const Deque: React.FC<{children?: React.ReactNode[], isActive: boolean}> = ({children, isActive}) => {
  const dequeStyle = isActive ? {} : {
    bottom: -20
  }
  return (
    <div style={dequeStyle} className={styles.deque}>
      {children}
    </div>
  )
}

export default GUI