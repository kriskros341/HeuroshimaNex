import { Canvas, ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import { useState, useEffect, useContext, createContext } from "react"
import { coords, response, TileInterface } from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from "../Contexts"
import { Socket } from "socket.io-client"
import { StaticDrawUsage, Vector2, Vector3 } from "three"
import { useTexture, Html } from "@react-three/drei"
import { EntityType, UnitList, ActionTypeKeys, direction, EntityActionType, ActiveCard } from "../../unitTypes"
import { createConnection } from "net"
import { useHandStore } from "../store"

const HexSideCount = 6
type HexProps = {
  hex: TileInterface
  transparent?: boolean
  onHover: (e: ThreeEvent<PointerEvent>) => void
  onHoverSideChange?: (d: direction) => void
  onClick?: (t: TileInterface) => void

  style: {
    radius: number, 
    height: number, 
    gridOffset: number
  }
  isSelected: boolean
  isHighlighted: boolean
  setSelected: (v: TileInterface) => void
  texture: THREE.Texture
}

interface ActionIndicator {
  height: number, 
  portionOfSide: number
}

interface HexActionIndicator extends Partial<ActionIndicator> {
  position: THREE.Vector3, 
  action: EntityActionType,
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

const actionToColor: Record<ActionTypeKeys, number> = {
  "block": 0xFFFFFF,
  "meele": 0xFF0000,
  "piercing": 0xFF00FF,
  "ranged": 0xCC0055,
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
const ActionIndicator: React.FC<HexActionIndicator> = ({ position, hexRadius, action, rotation = 0, height = 1, portionOfSide = 1}) => {
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
        <shapeBufferGeometry args={[triangleShape]} />
        <meshBasicMaterial color={actionToColor[action]} />
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

const Hex: React.FC<HexProps> = ({onHover, isHighlighted, transparent, hex, isSelected, setSelected, texture, style: {radius, gridOffset, height}, onHoverSideChange, onClick}) => {
  let rotation: direction = ((hex.tileEntity?.rotation || 0) + hex.rotation) as direction
  const playerColor = useContext(PlayerContext).players.find(p => p.id == hex.ownerId)?.color
  const {setDisplayedTile} = useContext(PlayerContext)
  const entityType = hex.tileEntity?.type || null
  useEffect(() => {
    select()
  }, [entityType])
  useEffect(() => {
    isSelected && setDisplayedTile({...hex, rotation: rotation})
  }, [rotation])
  const position = new THREE.Vector3((gridOffset + radius) * (Math.sqrt(3) *  hex.coords.x + Math.sqrt(3)/2 * hex.coords.y), (gridOffset+radius) * 3./2 * hex.coords.y, 0)
  const tileColor = playerColor ? 
    rgbToHex(...playerColor) : 0xffffff
  const [entityStats, setEntityStats] = 
    useState(entityType ? UnitList[entityType] : null)  
  const select = () => {
    setDisplayedTile({...hex, rotation: rotation})
    setEntityStats(entityType ? {...UnitList[entityType]} : null)
  }
  const connection = useContext(ConnectionContext)
  return (
    <>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onClick && onClick(hex)
          select()
          setSelected({...hex, rotation: rotation})
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          onHover(e)
          const pointOnHex = e.point.sub(position)
          const angleFromCenter: number = 
            Math.atan2(pointOnHex.y, pointOnHex.x) + rotationFromAxis
          const partOfHex = 
            THREE.MathUtils.euclideanModulo((angleFromCenter) / (2 * Math.PI) * 6, 6)
          const floored = Math.floor(partOfHex) as direction
          if(hex.tileEntity && floored != rotation) {
            isSelected && onHoverSideChange && onHoverSideChange(floored)//setRotation(floored)
          }
        }}
        rotation={[Math.PI/2, 0, 0]}
        position={position}
      >
        <meshStandardMaterial 
          color={isHighlighted ? 0xff0000 : tileColor} 
          map={texture} 
          transparent={!!transparent} 
          opacity={transparent ? 0.5 : 1}
        />
        <cylinderGeometry args={[radius, radius, height, HexSideCount, 1]} />
      </mesh>
      {isSelected && <SelectionIndicatior hexPosition={position} hexRadius={radius}/>}
      {entityStats?.health && <Html style={{color: "orange"}} position={position.clone().sub(new Vector3(0.2, 1.5, 0))}>{entityStats.health}</Html>}
      {entityStats && entityStats.actions.map((stats, idx) => {
        return (
          <ActionIndicator 
            key={`${hex.coords.x}_${hex.coords.y}_${idx}`}
            position={position}
            action={stats.type}
            hexRadius={radius}
            rotation={rotation + stats.direction}
            {...IndicatorOptions[stats.type]}
          />)
      })}
    </>
  )
}

const useHighlights = (hexes: TileInterface[], selectionType: ActiveCard | null) => {
  const [selected, setSelected] = useState<TileInterface | null>()
  const directions = selected?.tileEntity ? 
    selected.tileEntity.actions.map(action => 
      ({
        direction: directionToHex[(action.direction + selected.rotation) % HexSideCount],
        actionType: action.type
      })) 
    : []
  const selectArea = (radius: number) => {
    if(!selected?.coords) {
      return []
    }
    let temp = []
    for(let n = -radius; n <= radius; n++) {
      for(let m = Math.max(-radius, -n-radius); m <= Math.min(radius, -n+radius); m++) {
        let hex = hexes.find(hex => hex.coords.x == n + selected.coords.x && hex.coords.y == m + selected.coords.y)
        hex && temp.push(hex)
      }
    }
    return temp
  }
  const selectHexesDiagonally = (xOffset: number, yOffset: number, passThrough: boolean = false) => {
    let temp = []
    //imperative so much simpler here
    for(let n = 1; n < 5; n++) {
      const c = hexes.find(hex => 
        hex.coords.x == selected!.coords.x + xOffset * n &&
        hex.coords.y == selected!.coords.y + yOffset * n
      )
      if(c?.tileEntity?.actions.find(action => 
        selected?.tileEntity?.actions.some(a => {
          const sourceDirectionTo = a.direction + selected!.tileEntity!.rotation
          const targetDirectionFrom = THREE.MathUtils.euclideanModulo(action.direction + c!.tileEntity!.rotation + HexSideCount/2, HexSideCount)
          return action.type == EntityActionType.block && sourceDirectionTo == targetDirectionFrom
        }
        )
      )) {
        break;
      }
      if(!c) {
        break
      }
      c && temp.push(c)
      if(!passThrough && c?.tileEntity) {
        break
      }
    }
    return temp
  }

  const highlights = directions.flatMap(({direction: [xOffset, yOffset], actionType}) => {
    if(actionType == EntityActionType.ranged) {
      return selectHexesDiagonally(xOffset, yOffset).map(c => c.coords)
    } 
    if(actionType == EntityActionType.piercing) {
      return selectHexesDiagonally(xOffset, yOffset, true).map(c => c.coords)
    } 
    else {
      return hexes.filter(h => 
        h.coords.x == selected!.coords.x + xOffset &&
        h.coords.y == selected!.coords.y + yOffset
      ).map(c => c.coords)
    }
  })
  const h2 = 
    !selectionType ? 
      highlights : selectionType in EntityType ?
        highlights : selectArea(1).map(c => c.coords)

  return [h2, selected, (v: TileInterface | null) => setSelected(v)] as [coords[], TileInterface | null, (v: TileInterface | null) => void]
}


const useProjection = (hoveredHex: TileInterface | null, selectedCard: ActiveCard | null) => {
  const [projectedHex, setProjectedHex] = useState<TileInterface | null>(hoveredHex)
  const projectHex = (tile: TileInterface | null) => {
    setProjectedHex(
      selectedCard && tile && {
        ...tile,
        tileEntity: selectedCard in EntityType ? UnitList[selectedCard as EntityType] : null
      } || null
    )
  }
  const rotateProjection = (newRotation: direction) => {
    setProjectedHex(p => p ? ({...p, rotation: newRotation}) : null)
  }
  return [projectedHex, projectHex, rotateProjection] as [TileInterface | null, (tile: TileInterface | null) => void, (d: direction) => void]
  
}
/*
  TODO: bring rotation up to interaction manager
  so that I can rotate projection clientside only  
*/
const BoardInteractionManager: React.FC<{refreshBoard: () => void, hexes: TileInterface[], gridOffset: number}> = ({gridOffset, hexes, refreshBoard}) => {
  const [hexId, setHex] = useState<number | null>(null)
  const connection = useContext(ConnectionContext)
  const {setDisplayedTile} = useContext(PlayerContext)
  const [selectedCard, setSelectedCard, placeBase] = useHandStore(
    state => [state.active, state.setActive, state.placeBase])
  const [highlights, selectedHex, setSelectedHex] = useHighlights(hexes, selectedCard)
  const [projectedHex, projectHex, rotateProjection] = useProjection(selectedHex, selectedCard)
  
  const b = () => refreshBoard()
  useEffect(() => {
    connection?.on("broad:build", b)
    return () => {
      connection?.off("broad:build", b)
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
  
  const serverRotate = (newRotation: direction, hex: TileInterface) => {
    console.log(hex, newRotation)
    connection?.emit("req:rotate", hex.coords, newRotation, (resp: response<{}>) => {
      console.log("rotate: ", resp)
    })
    setSelectedHex({...hex, rotation: newRotation})
  }
  const build = (type: string) => {
      projectedHex && type in EntityType && connection?.emit("req:build", projectedHex, (data: response<TileInterface>) => {
      const response = unwrap(data)
      !!response && placeBase()
      !!response && setSelectedCard(null)
    })
  }

  return (
    <>
      <mesh
        geometry={
          new THREE.PlaneBufferGeometry(100, 100)
        }
        material={new THREE.MeshNormalMaterial({transparent:true, opacity: 0} )}
        onClick={()=>{
          // setHex, displayedTile
          // selectedHex
          // projectedHex

          // !hex => selectedHex => projectedHex

          // selectedCard
          // displayedTile
          setHex(null)
          setDisplayedTile(null)
          setSelectedHex(null)
          setSelectedCard(null)
          projectHex(null)
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
            onHover={(e: ThreeEvent<PointerEvent>) => {
              !hexId && setSelectedHex(tile)
              !hexId && projectHex(!tile?.tileEntity ? tile : null)
            }}
            onHoverSideChange={(d) => serverRotate(d, tile)}
            setSelected={(thisHex: TileInterface) => {
              setHex(hexId == idx ? null : idx)
              setSelectedHex(hexId == idx ? null : thisHex)
            }
            }
          />
        ) 
      })}
      {projectedHex && (
        <Hex
          hex={projectedHex}
          onHover={() => {
            setSelectedHex(projectedHex)
          }}
          onClick={(tile) => {
            tile?.tileEntity && build(tile.tileEntity.type)
          }}
          style={{
            radius: 2.5,
            height: 0.5,
            gridOffset: gridOffset,
          }}
          onHoverSideChange={(direction: direction) => {
            rotateProjection(direction)
          }}
          texture={ empty }
          isSelected={true}
          isHighlighted={false}
          setSelected={() => {}}
          transparent
        />
      )}
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