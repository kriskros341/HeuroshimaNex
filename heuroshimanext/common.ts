export enum TileBuild{
  free = 0,
  army,
  obstacle,
  base
}

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
  buildType: TileBuild
  coords: coords
}


export type color = [number, number, number] | null

export interface playerInterface {
  id: string,
  color: color
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