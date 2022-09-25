import { Canvas, ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import { useState, useEffect, useContext, createContext } from "react"
import { coords, response, TileInterface } from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from "../Contexts"
import { Socket } from "socket.io-client"
import { StaticDrawUsage, Vector2, Vector3 } from "three"
import { useTexture, Html } from "@react-three/drei"
import { EntityType, UnitList, ActionTypeKeys, direction, EntityActionType, ActiveCard, InstantAction } from "../../unitTypes"
import { useHandStore } from "../store"
import { HexSideCount, defaultTextureRotation, InteractiveHex } from "./Hex"


//duplicate
const directionToHex: Record<number, coords> = {
  0: {x: 1, y: 0},
  1: {x: 0, y: 1},
  2: {x: -1, y: 1},
  3: {x: -1, y: 0},
  4: {x: 0, y: -1},
  5: {x: 1, y: -1},
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

  const highlights = directions.flatMap(({direction: {x, y}, actionType}) => {
    if(actionType == EntityActionType.ranged) {
      return selectHexesDiagonally(x, y).map(c => c.coords)
    } 
    if(actionType == EntityActionType.piercing) {
      return selectHexesDiagonally(x, y).map(c => c.coords)
    } 
    else {
      return hexes.filter(h => 
        h.coords.x == selected!.coords.x + x &&
        h.coords.y == selected!.coords.y + y
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

const BoardInteractionManager: React.FC<{refreshBoard: () => void, hexes: TileInterface[], gridOffset: number}> = ({gridOffset, hexes, refreshBoard}) => {
  const [hexId, setHex] = useState<number | null>(null)
  const connection = useContext(ConnectionContext)
  const {setDisplayedTile, displayedTile} = useContext(PlayerContext)
  const [selectedCard, setSelectedCard, placeBase] = useHandStore(state => [state.active, state.setActive, state.placeBase])
  const [highlights, selectedHex, setSelectedHex] = useHighlights(hexes, selectedCard)
  const [projectedHex, projectHex, rotateProjection] = useProjection(selectedHex, selectedCard)
  const r = () => refreshBoard()
  useEffect(() => {
    connection?.on("broad:build", r)
    return () => {
      connection?.off("broad:build", r)
    }
  }, [connection?.active])

  const serverRotate = (newRotation: direction, hex: TileInterface) => {
    connection?.emit("req:rotate", hex.coords, newRotation, (resp: response<{}>) => {
      console.log("rotate: ", resp)
    })
    setSelectedHex({...hex, rotation: newRotation})
  }
  const build = (type: string) => {
      projectedHex && type in EntityType && connection?.emit("req:build", projectedHex, (data: response<TileInterface>) => {
      const response = unwrap(data)
      console.log(response)
      if(response) {
        placeBase()
        setSelectedCard(null)
        setHex(null)
      }
    })
  }
  const empty = useTexture("http://hnex.ddns.net:3000/assets/empty.png")
  const textures = useTexture<Record<EntityType, string>>({
    Base: "http://hnex.ddns.net:3000/assets/base.png",
    Solider: "http://hnex.ddns.net:3000/assets/army.png",
    Barricade: "http://hnex.ddns.net:3000/assets/obstacle.png", 
    Knight: "http://hnex.ddns.net:3000/assets/sword.png",
    Sniper: "http://hnex.ddns.net:3000/assets/sniper.png",
  })
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
  const common = {
    style: {
      radius: 2.5,
      height: 0.1,
      gridOffset: gridOffset
    }
  }
  const use = (action: InstantAction, coords: coords) => {
    connection?.emit("req:use_action", action, coords)
  }
  return (
    <>
      <mesh
        geometry={
          new THREE.PlaneBufferGeometry(100, 100)
        }
        material={new THREE.MeshNormalMaterial({transparent:true, opacity: 0} )}
        position={[0, 0, -20]}
        onClick={()=>{
          hexId && setHex(null)
          displayedTile && setDisplayedTile(null)
          selectedHex && setSelectedHex(null)
          selectedCard && setSelectedCard(null)
          projectedHex && projectHex(null)
        }}
      />
      {hexes.map((tile, idx) => {
        return (
          <InteractiveHex 
            hex={tile}
            key={`hex_nr_${idx}`} 
            texture={tile.tileEntity ? textures[tile.tileEntity.type].clone() : empty }
            isSelected={idx == hexId}
            isHighlighted={
              !!highlights.some(coord => 
                tile.coords.x == coord?.x &&  
                tile.coords.y == coord?.y
              )
            }
            onHover={(e: ThreeEvent<PointerEvent>) => {
              if(!hexId) {
                setSelectedHex(tile)
                projectHex(!tile?.tileEntity ? tile : null)
              }
            }}
            onHoverSideChange={(d) => idx == hexId && serverRotate(d, tile)}
            onClick={(e) => {
              setHex(hexId == idx ? null : idx)
              setSelectedHex(hexId == idx ? null : tile)
            }}
            {...common}
          />
        ) 
      })}
      {projectedHex && (
        <InteractiveHex
          hex={projectedHex}
          onHover={(e: ThreeEvent<PointerEvent>) => {
            setSelectedHex(projectedHex)
          }}
          offset={new Vector3(0, 0, 0.1)}
          onClick={() => {
            console.log("projection click")
            /*
            use:
              if action in entities:
                build
              if action in actions:
                use
            */
            console.log(projectedHex, selectedCard)
            if(!selectedCard) {
              return
            }
            if(selectedCard in EntityType) {
              !!projectedHex.tileEntity && build(projectedHex.tileEntity.type)
            }
            if(selectedCard in InstantAction) {
              use(selectedCard as InstantAction, projectedHex.coords)
            }
          }}
          materialProps={{color: 0x00ff00}}
          onHoverSideChange={(direction: direction) => {
            console.log(direction)
            rotateProjection(direction)
          }}
          
          texture={projectedHex.tileEntity ? textures[projectedHex.tileEntity.type].clone() : empty }
          isSelected={true}
          isHighlighted={false}
          transparent
          {...common}
        />
      )}
    </>
  )
}

const HexaBoard: React.FC<{gridOffset: number}> = ({gridOffset}) => {
  const [hexes, setHexes] = useState<TileInterface[]>([])
  const [boardReady, setBoardReady] = useState(false)
  const connection = useContext(ConnectionContext)
  const setupBoard = () => {
    if(!connection)
      return
    connection.emit("get_board", (r: response<TileInterface[]>) => {
      const response = unwrap(r)
      if(!response)
        return
      setHexes(response)
      setBoardReady(true)
    })
  }
  const rotate = (resp: TileInterface[]) => {
    setHexes([...resp])
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
      {boardReady && 
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
          position: [0, 0, 20]
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