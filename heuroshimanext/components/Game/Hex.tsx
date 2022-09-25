import * as THREE from "three"
import { StaticDrawUsage, Vector2, Vector3 } from "three"
import { EntityType, UnitList, ActionTypeKeys, direction, EntityActionType, ActiveCard } from "../../unitTypes"
import { coords, response, TileInterface } from "../../common"
import { PlayerContext, ConnectionContext, unwrap } from "../Contexts"
import { MaterialProps, MeshProps, MeshStandardMaterialProps, ThreeEvent } from "@react-three/fiber"
import { useContext, useEffect, useState } from "react"
import { Html } from "@react-three/drei"

export const HexSideCount = 6
export const rotationFromAxis = Math.PI/6
export const defaultTextureRotation = 2*Math.PI/HexSideCount
export type HexProps = {
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

interface HexActionIndicator extends Partial<ActionIndicator> {
  position: THREE.Vector3, 
  action: EntityActionType,
  hexRadius: number, 
  rotation: number, 
}

const actionToColor: Record<ActionTypeKeys, number> = {
  "block": 0xFFFFFF,
  "meele": 0xFF0000,
  "piercing": 0xFF00FF,
  "ranged": 0xCC0055,
}

function componentToHex(c: number) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
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

interface HexInterface extends MeshProps {
  materialProps?: Partial<MeshStandardMaterialProps>,
  style: {
    radius: number, 
    height: number, 
    gridOffset: number
    rotation?: direction | null
  }
  transparent?: boolean
} 

const Hex: React.FC<HexInterface> = (props) => {
  const {style: {radius, height}, materialProps, transparent} = props
  return (
    <mesh
      {...props}
      rotation={[Math.PI/2, 0, 0]}
    >
      <meshStandardMaterial 
        {...materialProps}
        transparent={transparent}
        opacity={transparent ? 0.5 : 1}
      />
      <cylinderGeometry args={[radius, radius, height, HexSideCount, 1]} />
    </mesh>
  )
}

interface GameHexInterface extends HexInterface {
  hex: TileInterface
  offset?: Vector3, 
  isSelected: boolean,
  texture: THREE.Texture
  isHighlighted: boolean
}
interface HexEventListeners {
  onHoverSideChange?: (d: direction) => any
  onHover?: (e: ThreeEvent<PointerEvent>) => any
}

export const GameHex: React.FC<GameHexInterface & HexEventListeners> = (props) => {
  const {onHoverSideChange, onHover, offset, isSelected, hex, texture, isHighlighted, style, transparent} = props
  const playerColor = useContext(PlayerContext).players.find(p => p.id == hex.ownerId)?.color
  const tileColor = isHighlighted ? 0xff0000 : playerColor ? rgbToHex(...playerColor) : 0xffffff
  const position = 
    new THREE.Vector3(
      (style.gridOffset + style.radius) * (Math.sqrt(3) *  hex.coords.x + Math.sqrt(3)/2 * hex.coords.y), 
      (style.gridOffset + style.radius) * 3./2 * hex.coords.y, 0)
  const finalPosition = offset ? position.add(offset) : position
  const meshProps = {...props, position: finalPosition, color: tileColor}
  hex.tileEntity?.health && console.log("h", hex.tileEntity.health)
  return (
    <>
      <Hex 
        {...meshProps}
        materialProps={{
          color: tileColor,
          map: texture
        }}
        onPointerMove={(e) => {
          onHover && onHover(e)
          transparent && e.stopPropagation()
          const pointOnHex = e.point.sub(position)
          const angleFromCenter: number = 
            Math.atan2(pointOnHex.y, pointOnHex.x) + rotationFromAxis
          const partOfHex = 
            THREE.MathUtils.euclideanModulo((angleFromCenter) / (2 * Math.PI) * 6, 6)
          const floored = Math.floor(partOfHex) as direction
          if(hex.tileEntity && floored != style.rotation) {
            onHoverSideChange && onHoverSideChange(floored)//setRotation(floored)
          }
        }}
      />
      {isSelected && <SelectionIndicatior hexPosition={finalPosition} hexRadius={style.radius}/>}
      {hex.tileEntity?.health && <Html style={{color: "orange"}} position={finalPosition.clone().sub(new Vector3(0.2, 1.5, 0))}>{hex.tileEntity.health}</Html>}

      {hex.tileEntity && hex.tileEntity.actions.map((stats, idx) => {
        return (
          <ActionIndicator 
            position={finalPosition}
            key={`${hex.coords.x}_${hex.coords.y}_${idx}`}
            action={stats.type}
            hexRadius={style.radius}
            rotation={hex.rotation + stats.direction}
            {...IndicatorOptions[stats.type]}
          />)
      })}

    </>
  )
}


export const InteractiveHex: React.FC<GameHexInterface & HexEventListeners> = (props) => {
  const {style, isSelected, hex, position} = props
  const entityType = props.hex.tileEntity?.type
  const [entityStats, setEntityStats] = 
    useState(entityType ? UnitList[entityType] : null)  
  return (
    <>
      <GameHex 
        {...props}
      />
    </>
  )
}
