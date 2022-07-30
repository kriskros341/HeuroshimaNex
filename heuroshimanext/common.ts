import { direction, TileEntity } from "./unitTypes"

export enum responseStatus {
  OK = "OK",
  NOPE = "NOPE"
}

export interface positiveResponse<T> {
  __type: "positive"
  status: responseStatus.OK
  data: T
}
export interface negativeResponse {
  __type: "negative"
  status: responseStatus
  reason: string
}

export type response<T> =
  positiveResponse<T> | negativeResponse


export type coords = {x: number, y: number}

export interface TileInterface {
  ownerId: string | null
  tileEntity: TileEntity | null
  coords: coords
}

export interface SelectedTileUnit extends TileInterface {
  rotation: direction
}

export type color = [number, number, number] | null

export interface PlayerInterface {
  id: string,
  color: color
  isTurn: boolean
}

export interface LobbyInterface {
  id: string,
  players: LobbyPlayerInterface[],
  maxPlayers: number
}

export interface LobbyPlayerInterface {
  id: string,
  userName: string,
  color: any
}

export enum Stage {
  waiting,
  base_placement,
  proper
}

export interface GameOptions {
  id: string,
  isStarted: boolean,
  stage: Stage
}

export interface TurnMessageInterface {
  currentStage: number
  turnNumber: number
}

