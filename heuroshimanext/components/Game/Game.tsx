import { Canvas, MeshProps, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useState, useEffect, useContext, useMemo, memo, useCallback } from "react"
import { response, coords, playerInterface, TileBuild, TileInterface, color } from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from "../Contexts"
import { Socket } from "socket.io-client"
import z from "zod"

import { TextureLoader } from "three"
import { useLoader } from "@react-three/fiber"



type HexProps = {
  hex: TileInterface
  radius: number, 
  height: number, 
  gridOffset: number
  isSelected: boolean
  setSelected: () => void
  texture: THREE.Texture
}

const enum HexState{
  default=0xffffff,
  selected=0xff0000,
  doubly=0x00ff00
}

const colorMap = new Map<TileBuild, number>()
colorMap.set(TileBuild.free, HexState.default)
colorMap.set(TileBuild.army, 0xff0000)
colorMap.set(TileBuild.base, 0x00ff00)
colorMap.set(TileBuild.obstacle, 0x0000ff)

const translateColor = (c: [number, number, number]) => {
  return c[0]*256 + c[1]*16 + c[2]
}



const Hex: React.FC<HexProps> = ({hex, radius, height, isSelected, setSelected, texture, gridOffset = 0}) => {
  const playerColor = useContext(PlayerContext).players.find(p => p.id == hex.ownerId)?.color
  const {setSelectMode} = useContext(PlayerContext)
  const getTileColor = () => 
    isSelected ? [1, 0, 0]  : hex.buildType == TileBuild.free ? [1, 1, 1] : playerColor ? [playerColor[0]!/255, playerColor![1]/255, playerColor![2]/255] : [0, 0, 0] 
  useEffect(() => {
  }, [isSelected])
  return (
    <mesh
      onClick={(e) => {
        e.stopPropagation()
        setSelected()
      }}
      onDoubleClick={() => {
      }}
      rotation={[Math.PI/2, 0, 0]}
      position={[(gridOffset + radius) * (Math.sqrt(3) *  hex.coords.x + Math.sqrt(3)/2 * hex.coords.y), (gridOffset+radius) * 3./2 * hex.coords.y, 0]}
    >
      
      <meshStandardMaterial color={new THREE.Color(...getTileColor())} map={texture}></meshStandardMaterial>
      <cylinderGeometry args={[radius, radius, height, 6, 1]} />
    </mesh>
  )
}

const validCoords = (radius: number) => {
   return z.object({
    x: z.number().min(-radius).max(radius),
    y: z.number().min(-radius).max(radius)
  })
}

const BoardInteractionManager: React.FC<{refreshBoard: () => void, hexes: TileInterface[], setCurrentHex: (v: TileInterface|null) => void, gridOffset: number}> = ({gridOffset, hexes, setCurrentHex, refreshBoard}) => {
  const [hexId, setHex] = useState<number | null>(null)
  const connection = useContext(ConnectionContext)
  const refresh = (d: TileInterface) => {
    setCurrentHex(d)
    refreshBoard()
    setHex(null)
  }
  useEffect(() => {
    connection?.on("broad:build", refresh)
    return () => {
      connection?.off("broad:build", refresh)
    }
  }, [connection?.active])
  const textures = useLoader(TextureLoader, [
    "http://heuroshimanex.ddns.net:3000/assets/empty.png", 
    "http://heuroshimanex.ddns.net:3000/assets/army.png", 
    "http://heuroshimanex.ddns.net:3000/assets/obstacle.png", 
    "http://heuroshimanex.ddns.net:3000/assets/base.png"
  ])
  useEffect(() => {
    textures[1].center = new THREE.Vector2(0.5, 0.5)
    textures[1].repeat = new THREE.Vector2(1.5, 1.5)
    textures[1].rotation = Math.PI/2
    textures[2].center = new THREE.Vector2(0.5, 0.5)
    textures[2].repeat = new THREE.Vector2(1.5, 1.5)
    textures[2].rotation = Math.PI/2
    textures[3].center = new THREE.Vector2(0.5, 0.5)
    textures[3].repeat = new THREE.Vector2(1.5, 1.5)
    textures[3].rotation = Math.PI/2
  }, [])
  return (
    <>
      <mesh
        geometry={
          new THREE.PlaneBufferGeometry(100, 100)
        }
        material={new THREE.MeshNormalMaterial({transparent:true, opacity: 0} )}
        onClick={()=>{
          setHex(null)
          setCurrentHex(null)
        }}
      />
      {hexes.map((tile, idx) => {
        return (
          <Hex 
            hex={tile}
            key={`hex_nr_${idx}`} 
            radius={1} 
            height={0.1} 
            gridOffset={gridOffset}
            texture={textures[tile.buildType]}
            isSelected={idx == hexId}
            setSelected={() => {
              setHex(idx)
              setCurrentHex(tile)
            }
            }
          />
        ) 
      })}
    </>
  )
}

const HexaBoard: React.FC<{radius: number, gridOffset: number, setCurrentHex: (v:TileInterface|null) => void}> = ({gridOffset, setCurrentHex}) => {
  const [hexes, setHexes] = useState<(TileInterface)[]>([])
  const [boardReady, setBoardReady] = useState(false)
  const connection = useContext(ConnectionContext)
  const setupBoard = () => {
    if(!connection)
      return
    connection.emit("get_board", (r: response<TileInterface[]>) => {
      const response = unwrap(r)
      if(!response) {
        return
      }
      setHexes(response)
      setBoardReady(true)
    })
  }
  useEffect(() => {
    setupBoard()
  }, [])
  useEffect(() => {
    connection?.on("broad:board", setupBoard)
    return () => {
      connection?.off("broad:board", setupBoard)
    }
  }, [connection])
  return (
    <>
      {boardReady && 
        <BoardInteractionManager 
          hexes={hexes} 
          gridOffset={gridOffset}
          setCurrentHex={(d: TileInterface| null) => setCurrentHex(d)}
          refreshBoard={() => setupBoard()}
        />
      }
    </>
  )
}


const Game: React.FC<{pickHex: (v:TileInterface|null) => void, playerContext: PlayerContext, connection: Socket}> = ({pickHex, playerContext, connection}) => {
  return (
    <div style={{position: "absolute", width: "100vw", height: "100vh"}}>
      <Canvas
        onClick={() => {}}
        camera={{
          near: 0.1,
          far: 1000,
          position: [
            0, 0, 20
          ]
        }}
      >
      <ConnectionContext.Provider value={connection}>
        <PlayerContext.Provider value={playerContext}>
          <ambientLight />
          <pointLight intensity={0.4} position={[10, 10, 10]} />
          <HexaBoard radius={4} gridOffset={0.2} setCurrentHex={(v: TileInterface | null) => {pickHex(v)}} />  
        </PlayerContext.Provider>
      </ConnectionContext.Provider>       
      </Canvas>
    </div>
  )
}

export default Game