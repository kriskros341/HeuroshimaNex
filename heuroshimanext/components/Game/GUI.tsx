import Image from 'next/image'
import React, { useContext, useEffect, useState } from 'react'
import styles from '../../styles/Gui.module.css'
import {response, color, playerInterface, TileInterface, TileBuild} from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from '../Contexts'
import { Socket } from 'socket.io-client'

const TurnCounter: React.FC<{}> = () =>{
  return(
    <b>Turn:<span></span></b>
  )
}

const GamerList:React.FC<{showIf: boolean, turn: number, players: playerInterface[]}>=({showIf, turn, players})=> {
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


const MyButton: React.FC<{fun: () => void, children: string}>=({fun, children})=> {
  return(
    <button onClick={() => fun()}>{children}</button>
  )
}

const translateColor = (c: [number, number, number]) => {
  return c[0]*256 + c[1]*16 + c[2]
}

const GUI: React.FC<{selectedTile:TileInterface|null}> = ({selectedTile}) => {
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
    const response = unwrap(resp)
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
    <div className={styles.guiContainer}>
      <div className={styles.gui}>
        <div id="mainGui">GUIII<br />
        <b>Turn: {turn}</b><br />
        {thisPlayer ? 
          <span 
            style={{color: isMyMove ? "green" : "white"}}
          >Player ID: {thisPlayer?.id} 
            <span 
              style={{backgroundColor: `rgba(${thisPlayer.color![0]}, ${thisPlayer.color![1]}, ${thisPlayer.color![2]})`}} 
              className={styles.colorIndicator}>
            </span>
          </span>
          :
          <MyButton fun={join}>join</MyButton>
        }
        <GamerList showIf={players.length > 1} turn={turn} players={players}/>
        <MyButton fun={restart}>restart</MyButton>
        <MyButton fun={refreshPlayerList}>Debug</MyButton>
        <MyButton fun={next_turn}>Next Turn</MyButton>
      </div>
        {selectedTile && <Stats selectedTile={selectedTile} />}
      </div>
      <Hand connection={connection} selectedTile={selectedTile}/>
    </div>
  )
}
const Hand: React.FC<{connection: Socket | null, selectedTile: TileInterface | null}> = ({selectedTile, connection}) => {
  const build = (type: TileBuild) => {
    connection?.emit("req:build", selectedTile?.coords, type, (data: response<TileInterface>) => {
      unwrap(data)
    })
  }
  return (
    <div className={styles.hand}>
      <Deque isActive={!!selectedTile}>
        <Card onClick={() => build(TileBuild.army)}>army</Card>
        <Card onClick={() => build(TileBuild.obstacle)}>obstacle</Card>
        <Card onClick={() => build(TileBuild.base)}>base</Card>
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