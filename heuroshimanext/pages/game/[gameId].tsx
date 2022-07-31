import type { NextPage } from 'next'
import dynamic from "next/dynamic"
import Head from 'next/head'
import Image from 'next/image'
import { useContext, useEffect, useState } from 'react'
import styles from '../../styles/Game.module.css'
import {response, color, PlayerInterface, TileInterface, GameOptions, SelectedTileUnit} from "../../common"
import { io, Socket } from 'socket.io-client'
import { PlayerContext, ConnectionContext, unwrap, Config } from '../../components/Contexts'
import GUI from "../../components/Game/GUI"
import { useSocket } from '../../components/Connection'
import { GetServerSideProps } from 'next'

const Game: any = dynamic(() => import("../../components/Game/Game"), {
  ssr: false,
  loading: () => <div className={styles.loadingStyle}>LOADING</div>
})

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {props: {gameId: context?.params?.gameId}}
}


const G: NextPage<{gameId: number}> = ({gameId}) => {
  const [gameOptions, setGameOptions] = useState<GameOptions>()
  const [selected, setSelected]=useState<SelectedTileUnit | null>(null)
  const [player, setPlayer] = useState<PlayerInterface | null>(null)
  const [players, setPlayers] = useState<PlayerInterface[]>([])
  
  const connection = useSocket(`ws://heuroshimanex.ddns.net:8000/game`)
  const handleSetPlayerList = (data: PlayerInterface[]) => {
    setPlayers(data)
    setPlayer(data?.find(p => p.id == connection?.id) || null)
  }
  const handleRefreshPlayerList = (response: response<PlayerInterface[]>) => {
    const data = unwrap(response)
    data && handleSetPlayerList(data)
  }
  console.log(player)
  const refreshPlayerList = () => {
    connection && connection.emit("sync_players", (d: response<PlayerInterface[]>) => handleRefreshPlayerList(d))
  }
  useEffect(() => {
    const onConnect = () => console.log("connected!")
    if(connection) {
      connection.on("connect", onConnect)
      connection.on("broad:player_list", handleSetPlayerList)
      connection.on("broad:sync_players", handleSetPlayerList)
      connection.emit("req:subscribe", gameId, (response: response<GameOptions>) => {
        const data = unwrap(response)
        data && setGameOptions(data)
      })
      refreshPlayerList()
    }
    return () => {
      connection?.off("connect", onConnect)
      connection?.off("broad:player_list", setPlayers)
      connection?.off("broad:sync_players", setPlayers)
    }
  }, [connection])
  const playerContext = {
    thisPlayer: player, 
    players: players,
    refreshPlayerList: refreshPlayerList,
    displayedTile: selected,
    setDisplayedTile: (v: SelectedTileUnit | null) => setSelected(v)
  }
    
  return (
    <div className={styles.container}>
      <Head>
        <title>HeuroshimaNext v.0.1</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
        {connection && 
          <Game 
            connection={connection} 
            playerContext={playerContext!} 
            pickHex={(v: SelectedTileUnit | null) => setSelected(v)}
          />
        }
        <ConnectionContext.Provider value={connection}>
          <PlayerContext.Provider value={playerContext!}>
            <GUI selectedTile={selected} />
          </PlayerContext.Provider>
        </ConnectionContext.Provider>
    </div>
  )
}

/*
  TODO:
  talia kart
  - attack mechanic
*/

export default G