
export type direction = 0 | 1 | 2 | 3 | 4 | 5
export type initiative = 0 | 1 | 2 | 3

export enum EntityActionType {
  meele = "meele",
  ranged = "ranged",
  block = "block",
  piercing = "piercing"
}

export interface Action {
  type: EntityActionType
  direction: direction
}

export interface CardType {
  cardType: "__Entity" | "__Action"

}


export interface BuildCommand {
  rotation: direction,
  type: EntityType
}

export interface TileEntity extends CardType {
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
export type ActionTypeKeys = keyof typeof EntityActionType

export type UnitListInterface = {
  [key in EntityTypeKeys]: TileEntity
}


export const UnitList: UnitListInterface = {
  Base: {
    cardType: "__Entity",
    rotation: 0,
    initiative: 0,
    health: Infinity,
    actions: [
      {type: EntityActionType.meele, direction: 0},
      {type: EntityActionType.meele, direction: 1},
      {type: EntityActionType.meele, direction: 2},
      {type: EntityActionType.meele, direction: 3},
      {type: EntityActionType.meele, direction: 4},
      {type: EntityActionType.meele, direction: 5},
    ],
    type: EntityType.Base
  },
  Solider: {
    cardType: "__Entity",
    rotation: 0,
    initiative: 2,
    health: 2,
    actions: [
      {type: EntityActionType.ranged, direction: 0},
      {type: EntityActionType.meele, direction: 1} 
    ],
    type: EntityType.Solider
  },
  Barricade: {
    cardType: "__Entity",
    rotation: 0,
    initiative: 0,
    health: 6,
    actions: [
      {type: EntityActionType.block, direction: 5}, 
      {type: EntityActionType.block, direction: 0}, 
      {type: EntityActionType.block, direction: 1}, 
    ],
    type: EntityType.Barricade
  },
  Knight: {
    cardType: "__Entity",
    rotation: 0,
    initiative: 3,
    health: 4,
    actions: [
      {type: EntityActionType.meele, direction: 0},
      {type: EntityActionType.block, direction: 0}
    ],
    type: EntityType.Knight
  },
  Sniper: {
    cardType: "__Entity",
    rotation: 0,
    initiative: 0,
    health: 1,
    actions: [{type: EntityActionType.piercing, direction: 0}],
    type: EntityType.Sniper
  }
}

export enum InstantAction {
  Nuke = "Nuke",
  Heal = "Heal"
}

export interface InstantActionInterface extends CardType {
  cardType: "__Action",
  type: InstantAction,
  radius: number,
  stats: any
}



export type InstantActionTypeKeys = keyof typeof InstantAction


export type InstantActionListInterface = {
  [key in InstantActionTypeKeys]: InstantActionInterface
}

const ActionList: InstantActionListInterface = {
  Nuke: {
    cardType: "__Action",
    type: InstantAction.Nuke,
    radius: 1,
    stats: {
      damage: 1
    }
  },
  Heal: {
    cardType: "__Action",
    type: InstantAction.Heal,
    radius: 1,
    stats: {
      healing: 1
    }
  }
}

export type ActiveCard = EntityType | InstantAction