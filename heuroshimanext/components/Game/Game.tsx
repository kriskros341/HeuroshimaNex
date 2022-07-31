import { Canvas } from "@react-three/fiber"
import * as THREE from "three"
import { useState, useEffect, useContext } from "react"
import { response, TileInterface } from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from "../Contexts"
import { Socket } from "socket.io-client"
import { Vector2, Vector3 } from "three"
import { useTexture } from "@react-three/drei"
import { EntityType, UnitList, ActionTypeKeys, direction, ActionType } from "../../unitTypes"

const HexSideCount = 6
type HexProps = {
  hex: TileInterface
  style: {
    radius: number, 
    height: number, 
    gridOffset: number
  }
  isSelected: boolean
  isHighlighted: boolean
  toggleSelected: () => void
  texture: THREE.Texture
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

const directionToHex: Record<number, [number, number]> = {
  0: [1, 0],
  1: [0, 1],
  2: [-1, 1],
  3: [-1, 0],
  4: [0, -1],
  5: [1, -1],
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
// height is represented as a portion of distance to side
// width is represented as a portion of length of side
const ActionIndicator: React.FC<HexActionIndicator> = ({position, hexRadius, rotation = 0, height = 1, portionOfSide = 1}) => {
  const distanceToBorder = hexRadius * Math.cos(Math.PI/6)
  const correctedHeight = hexRadius * height * Math.cos(Math.PI/6)
  const v1 = new Vector2(- correctedHeight + distanceToBorder, 0)
  const v2 = new Vector2(distanceToBorder, hexRadius * portionOfSide/2)
  const v3 = new Vector2(distanceToBorder, - hexRadius * portionOfSide/2)
  const pos2d = [...position.toArray()].slice(0, 2)
  const positionVector = new Vector2(pos2d[0], pos2d[1])
  v1.applyMatrix3(rotationMatrix(rotation * Math.PI/3)).add(positionVector)
  v2.applyMatrix3(rotationMatrix(rotation * Math.PI/3)).add(positionVector)
  v3.applyMatrix3(rotationMatrix(rotation * Math.PI/3)).add(positionVector)
  const triangleShape = new THREE.Shape([v1, v2, v3])
  return (
      <mesh position={[0, 0, 0.05]}>
        <shapeBufferGeometry attach="geometry" args={[triangleShape]} />
        <meshBasicMaterial attach="material" color={'#FF0000'} />
      </mesh>
  )
}

type IndicatorOptions = {[key in ActionTypeKeys]: Partial<ActionIndicator>}
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
  },
  piercing: {
    height: 1,
    portionOfSide: 0.2
  }
}

function componentToHex(c: number) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

const rotationFromAxis = Math.PI/6


const SelectionIndicatior: React.FC<{hexPosition: Vector3, hexRadius: number}> = ({hexPosition, hexRadius}) => {
  return (
    <>
      <mesh
        position={hexPosition}
        rotation={[0, 0, rotationFromAxis]}
      >
        <ringBufferGeometry args={[hexRadius, hexRadius + 0.1, 6]}/>
        <meshStandardMaterial color={0xff00000} />
      </mesh>
    </>
  )
}

const Hex: React.FC<HexProps> = ({isHighlighted, hex, isSelected, toggleSelected, texture, style: {radius, gridOffset, height}}) => {
  const playerColor = useContext(PlayerContext).players.find(p => p.id == hex.ownerId)?.color
  const {setDisplayedTile} = useContext(PlayerContext)
  const entityType = hex.tileEntity?.type || null
  useEffect(() => {
    setEntityStats(entityType ? {...UnitList[entityType]} : null)
  }, [entityType])
  const position = new THREE.Vector3((gridOffset + radius) * (Math.sqrt(3) *  hex.coords.x + Math.sqrt(3)/2 * hex.coords.y), (gridOffset+radius) * 3./2 * hex.coords.y, 0)
  let rotation: direction = hex.tileEntity?.rotation || 0
  const tileColor = playerColor ? 
    rgbToHex(...playerColor) : 0xffffff
  const [entityStats, setEntityStats] = 
    useState(entityType ? UnitList[entityType] : null)  
  
  const select = () => {
    setDisplayedTile({...hex, rotation: rotation})
    toggleSelected()
  }
  const connection = useContext(ConnectionContext)
  const rotate = (newRotation: direction) => {
    connection?.emit("req:rotate", hex.coords, newRotation, (resp: response<{}>) => {
      console.log("rotate: ", resp)
    })
  }
  return (
    <>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          select()
        }}
        onPointerMove={(e) => {
          const pointOnHex = e.point.sub(position)
          const angleFromCenter: number = 
            Math.atan2(pointOnHex.y, pointOnHex.x) + rotationFromAxis
          const partOfHex = 
            THREE.MathUtils.euclideanModulo((angleFromCenter) / (2 * Math.PI) * 6, 6)
          const floored = Math.floor(partOfHex) as direction
          if(hex.tileEntity && floored != rotation) {
            isSelected && rotate(floored)//setRotation(floored)
          }
        }}
        rotation={[Math.PI/2, 0, 0]}
        position={position}
      >
        <meshStandardMaterial 
          color={isHighlighted ? 0xff0000 : tileColor} 
          map={texture}
        />
        <cylinderGeometry 
          args={[radius, radius, height, HexSideCount, 1]} 
        />
      </mesh>
      {isSelected && 
        <SelectionIndicatior 
          hexPosition={position} 
          hexRadius={radius}
        />
      }
      {entityStats && entityStats.actions.map((stats, idx) => {
        return (
          <ActionIndicator 
            key={`${hex.coords.x}_${hex.coords.y}_${idx}`}
            position={position} 
            hexRadius={radius}
            rotation={rotation + stats.direction}
            {...IndicatorOptions[stats.type]}
          />)
      })}
    </>
  )
}

const distances = [1, 2, 3, 4, 5]
const BoardInteractionManager: React.FC<{refreshBoard: () => void, hexes: TileInterface[], gridOffset: number}> = ({gridOffset, hexes, refreshBoard}) => {
  const [hexId, setHex] = useState<number | null>(null)
  const connection = useContext(ConnectionContext)
  const {setDisplayedTile, displayedTile} = useContext(PlayerContext)
  useEffect(() => {
    connection?.on("broad:build", refreshBoard)
    return () => {
      connection?.off("broad:build", refreshBoard)
    }
  }, [connection?.active])
  const empty = useTexture("http://heuroshimanex.ddns.net:3000/assets/empty.png")
    
  const textures = useTexture<Record<EntityType, string>>({
    Base: "http://heuroshimanex.ddns.net:3000/assets/base.png",
    Solider: "http://heuroshimanex.ddns.net:3000/assets/army.png",
    Barricade: "http://heuroshimanex.ddns.net:3000/assets/obstacle.png", 
    Knight: "http://heuroshimanex.ddns.net:3000/assets/sword.png",
    Sniper: "http://heuroshimanex.ddns.net:3000/assets/sniper.png",
  })
  const defaultTextureRotation = 2*Math.PI/HexSideCount
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
  const directions = displayedTile?.tileEntity ? 
    displayedTile.tileEntity.actions.map(action => 
      ({
        direction: directionToHex[(action.direction + displayedTile.rotation) % HexSideCount],
        actionType: action.type
      })) 
    : []
  const selectHexesDiagonally = (xOffset: number, yOffset: number, passThrough: boolean = false) => {
    let temp = []
    //imperative so much simpler here
    for(let n of distances) {
      const c = hexes.find(hex => 
        hex.coords.x == displayedTile!.coords.x + xOffset * n &&
        hex.coords.y == displayedTile!.coords.y + yOffset * n
      )
      c && temp.push(c)
      if(!passThrough && c?.tileEntity) {
        break
      }
    }
    return temp
  }
  const highlights = directions.flatMap(({direction: [xOffset, yOffset], actionType}) => {
    if(actionType == ActionType.ranged) {
      return selectHexesDiagonally(xOffset, yOffset).map(c => c.coords)
    } 
    if(actionType == ActionType.piercing) {
      return selectHexesDiagonally(xOffset, yOffset, true).map(c => c.coords)
    } 
    else {
      return hexes.filter(h => 
        h.coords.x == displayedTile!.coords.x + xOffset &&
        h.coords.y == displayedTile!.coords.y + yOffset
      ).map(c => c.coords)
    }
  })
  console.log(highlights)
  return (
    <>
      <mesh
        geometry={
          new THREE.PlaneBufferGeometry(100, 100)
        }
        material={new THREE.MeshNormalMaterial({transparent:true, opacity: 0} )}
        onClick={()=>{
          setHex(null)
          setDisplayedTile(null)
        }}
      />
      {hexes.map((tile, idx) => {
        return (
          <Hex 
            hex={tile}
            key={`hex_nr_${idx}`} 
            style={{
              radius: 2.5,
              height: 0.1,
              gridOffset: gridOffset
            }}
            texture={tile.tileEntity ? textures[tile.tileEntity.type].clone() : empty }
            isSelected={idx == hexId}
            isHighlighted={
              !!highlights.some(coord => 
                tile.coords.x == coord?.x &&  
                tile.coords.y == coord?.y
              )
            }
            toggleSelected={() => {
              setHex(hexId == idx ? null : idx)
            }
            }
          />
        ) 
      })}
    </>
  )
}

const HexaBoard: React.FC<{gridOffset: number}> = ({gridOffset}) => {
  const [hexes, setHexes] = useState<TileInterface[]>([])
  const [boardReady, setBoardReady] = useState(false)
  const [, refresher] = useState(0)
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
  const rotate = (resp: TileInterface[]) => {
    setBoardReady(false)
    console.log("jd")
    setHexes([...resp])
    setBoardReady(true)
  }
  useEffect(() => {
    setupBoard()
  }, [])
  useEffect(() => {
    connection?.on("broad:board", setupBoard)
    connection?.on("broad:rotate", rotate) //this is bad.
    return () => {
      connection?.off("broad:board", setupBoard)
      connection?.off("broad:rotate", rotate)
    }
  }, [connection])
  return (
    <>
      {!!boardReady && 
        <BoardInteractionManager 
          hexes={hexes} 
          gridOffset={gridOffset}
          refreshBoard={() => setupBoard()}
        />
      }
    </>
  )
}


const Game: React.FC<{playerContext: PlayerContext, connection: Socket}> = ({playerContext, connection}) => {
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
          <HexaBoard gridOffset={0.2} />  
        </PlayerContext.Provider>
      </ConnectionContext.Provider>       
      </Canvas>
    </div>
  )
}

export default Game