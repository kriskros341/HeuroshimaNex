import { Canvas, MeshProps, useFrame, useThree} from "@react-three/fiber"
import * as THREE from "three"
import { useState, useEffect, useContext, useMemo, memo, useCallback } from "react"
import { response, coords, PlayerInterface, TileInterface, color } from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from "../Contexts"
import { Socket } from "socket.io-client"
import z from "zod"

import { Line, Texture, TextureLoader, Vector2, Vector3 } from "three"
import { useTexture } from "@react-three/drei"
import { Action, EntityType, UnitList, ActionTypeKeys } from "../../unitTypes"



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

const rotationMatrix = (angle: number) => {
  const c = new THREE.Matrix3()
  c.fromArray([
    Math.cos(angle), Math.sin(angle), 0,
    -Math.sin(angle), Math.cos(angle), 0,
    0, 0, 1
  ])
  return c 
}  

interface ActionIndicator {
  height: number, 
  portionOfSide: number
}

interface HexActionIndicator extends Partial<ActionIndicator> {
  position: THREE.Vector3, 
  hexRadius: number, 
  rotation: number, 
}
// height is represented as a portion of distance to side
// width is represented as a portion of length of side
const ActionIndicator: React.FC<HexActionIndicator> = ({position, hexRadius, rotation = 0, height = 1, portionOfSide = 1}) => {
  const distanceToBorder = hexRadius * Math.cos(Math.PI/6)
  const correctedHeight = hexRadius * height * Math.cos(Math.PI/6)
  const v1 = new Vector2(position.x - correctedHeight + distanceToBorder, position.y)
  const v2 = new Vector2(position.x + distanceToBorder, position.y + hexRadius * portionOfSide/2)
  const v3 = new Vector2(position.x + distanceToBorder, position.y - hexRadius * portionOfSide/2)
  v1.applyMatrix3(rotationMatrix(rotation * Math.PI/3))
  v2.applyMatrix3(rotationMatrix(rotation * Math.PI/3))
  v3.applyMatrix3(rotationMatrix(rotation * Math.PI/3))
  const triangleShape = new THREE.Shape([v1, v2, v3])
  return (
      <mesh position={[0, 0, 0.05]}>
        <shapeBufferGeometry attach="geometry" args={[triangleShape]} />
        <meshBasicMaterial attach="material" color={'#FF0000'} />
      </mesh>
  )
}

type IndicatorOptions = 
  {[key in ActionTypeKeys]: Partial<ActionIndicator>}

  const IndicatorOptions: IndicatorOptions = {
  meele: {
    height: 0.4,
    portionOfSide: 0.4
  },
  ranged: {
    height: 0.8,
    portionOfSide: 0.4
  },
  block: {
    height: 0.2,
    portionOfSide: 0.8
  }

}

const Hex: React.FC<HexProps> = ({hex, radius, height, isSelected, setSelected, texture, gridOffset = 0}) => {
  const playerColor = useContext(PlayerContext).players.find(p => p.id == hex.ownerId)?.color
  const getTileColor = () => 
    isSelected ? [1, 0, 0]  : hex.tileEntity == null ? [1, 1, 1] : playerColor ? [playerColor[0]!/255, playerColor![1]/255, playerColor![2]/255] : [0, 0, 0] 
  const entityType = hex.tileEntity?.type || null
  useEffect(() => {
    setEntityStats(entityType ? UnitList[entityType] : null)
  }, [entityType])
  const position = new THREE.Vector3((gridOffset + radius) * (Math.sqrt(3) *  hex.coords.x + Math.sqrt(3)/2 * hex.coords.y), (gridOffset+radius) * 3./2 * hex.coords.y, 0)
  const rotationFromAxis = Math.PI/6
  const [rotation, setRotation] = useState(0)
  texture.rotation = 5*Math.PI/6 + rotation * Math.PI/3 + rotationFromAxis
  const tileColor = playerColor ? (playerColor[0]/255) * 256 + (playerColor[1]/255) * 16 + (playerColor[2]/255) : 0xffffff
  

  const [entityStats, setEntityStats] = 
    useState(entityType ? UnitList[entityType] : null)
    console.log(entityType && UnitList[entityType], entityStats)
  return (
    <>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          setSelected()
        }}
        onPointerMove={(e) => {
          const pointOnHex = e.point.sub(position)
          const angleFromCenter = 
            Math.atan2(pointOnHex.y, pointOnHex.x) + rotationFromAxis
          const partOfHex = 
            THREE.MathUtils.euclideanModulo((angleFromCenter) / (2 * Math.PI) * 6, 6)
          const floored = Math.floor(partOfHex)
          if(floored != rotation) {
            isSelected && setRotation(floored)
          }
        }}
        rotation={[Math.PI/2, 0, 0]}
        position={position}
      >
        <meshStandardMaterial color={tileColor} map={texture}></meshStandardMaterial>
        <cylinderGeometry args={[radius, radius, height, 6, 1]} />
      </mesh>
      {isSelected && (
        <mesh
          position={position}
          rotation={[0, 0, rotationFromAxis]}
        >
          <ringBufferGeometry args={[radius, radius + 0.1, 6]}/>
          <meshStandardMaterial color={0xff00000} />
        </mesh>
      )}
      {entityStats && entityStats.actions.map(stats => {
        return (
          <ActionIndicator 
            position={position} 
            hexRadius={radius}
            rotation={rotation + stats.direction}
            {...IndicatorOptions[stats.type]}
          />)
      })}
    </>
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
  const empty = useTexture("http://heuroshimanex.ddns.net:3000/assets/empty.png")
    
  const textures = useTexture<Record<EntityType, string>>({
    Base: "http://heuroshimanex.ddns.net:3000/assets/base.png",
    Solider: "http://heuroshimanex.ddns.net:3000/assets/army.png",
    Barricade: "http://heuroshimanex.ddns.net:3000/assets/obstacle.png", 
    Knight: "http://heuroshimanex.ddns.net:3000/assets/sword.png",
  })
  console.log(textures)
  const defaultTextureRotation = Math.PI/2
  useEffect(() => {
    textures[EntityType.Solider].center = new THREE.Vector2(0.5, 0.5)
    textures[EntityType.Solider].repeat = new THREE.Vector2(1.5, 1.5)
    textures[EntityType.Solider].rotation = defaultTextureRotation
    textures[EntityType.Barricade].center = new THREE.Vector2(0.5, 0.5)
    textures[EntityType.Barricade].repeat = new THREE.Vector2(1.5, 1.5)
    textures[EntityType.Barricade].rotation = defaultTextureRotation
    textures[EntityType.Knight].center = new THREE.Vector2(0.5, 0.5)
    textures[EntityType.Knight].repeat = new THREE.Vector2(1.5, 1.5)
    textures[EntityType.Knight].rotation = defaultTextureRotation
    textures[EntityType.Base].center = new THREE.Vector2(0.5, 0.5)
    textures[EntityType.Base].repeat = new THREE.Vector2(1.5, 1.5)
    textures[EntityType.Base].rotation = defaultTextureRotation
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
            radius={2.5} 
            height={0.1} 
            gridOffset={gridOffset}
            texture={tile.tileEntity ? textures[tile.tileEntity.type] : empty }
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

const HexaBoard: React.FC<{gridOffset: number, setCurrentHex: (v:TileInterface|null) => void}> = ({gridOffset, setCurrentHex}) => {
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
          <HexaBoard gridOffset={0.2} setCurrentHex={(v: TileInterface | null) => {pickHex(v)}} />  
        </PlayerContext.Provider>
      </ConnectionContext.Provider>       
      </Canvas>
    </div>
  )
}

export default Game