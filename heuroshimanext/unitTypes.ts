
export enum CardType {
  instant = 0,
  entity,
  module
}



export type direction = 0 | 1 | 2 | 3 | 4 | 5
export type initiative = 0 | 1 | 2 | 3

export enum ActionType {
  meele = "meele",
  ranged = "ranged",
  block = "block",
  piercing = "piercing"
}

export interface Action {
  type: ActionType
  direction: direction
}


export interface BuildCommand {
  rotation: direction,
  type: EntityType
}

export interface TileEntity {
  type: EntityType
  rotation: direction
  initiative: initiative
  health: number
  actions: Action[]
}

// must be repeated for indexing of UnitList
export enum EntityType {
  Solider = "Solider",
  Barricade = "Barricade",
  Knight = "Knight",
  Base = "Base",
  Sniper = "Sniper"
}

export type EntityTypeKeys = keyof typeof EntityType
export type ActionTypeKeys = keyof typeof ActionType

export type UnitListInterface = {
  [key in EntityTypeKeys]: TileEntity
}

export const UnitList: UnitListInterface = {
  Base: {
    rotation: 0,
    initiative: 0,
    health: Infinity,
    actions: [
      {type: ActionType.meele, direction: 0},
      {type: ActionType.meele, direction: 1},
      {type: ActionType.meele, direction: 2},
      {type: ActionType.meele, direction: 3},
      {type: ActionType.meele, direction: 4},
      {type: ActionType.meele, direction: 5},
    ],
    type: EntityType.Base
  },
  Solider: {
    rotation: 0,
    initiative: 2,
    health: 2,
    actions: [
      {type: ActionType.ranged, direction: 0},
      {type: ActionType.meele, direction: 1} 
    ],
    type: EntityType.Solider
  },
  Barricade: {
    rotation: 0,
    initiative: 0,
    health: 6,
    actions: [
      {type: ActionType.block, direction: 5}, 
      {type: ActionType.block, direction: 0}, 
      {type: ActionType.block, direction: 1}, 
    ],
    type: EntityType.Barricade
  },
  Knight: {
    rotation: 0,
    initiative: 3,
    health: 4,
    actions: [
      {type: ActionType.meele, direction: 0},
      {type: ActionType.block, direction: 0}
    ],
    type: EntityType.Knight
  },
  Sniper: {
    rotation: 0,
    initiative: 0,
    health: 1,
    actions: [{type: ActionType.piercing, direction: 0}],
    type: EntityType.Sniper
  }
}

export enum InstantAction {
  Nuke = "Nuke",
}

export interface InstantActionInterface {
  radius: number
}

export type InstantActionTypeKeys = keyof typeof InstantAction

export type InstantActionListInterface = {
  [key in InstantActionTypeKeys]: InstantActionInterface
}

export enum InstantAction {

}

export interface InstantActionType {


}