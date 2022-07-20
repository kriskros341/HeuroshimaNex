import { createContext } from "react"
import {Socket} from "socket.io-client"
import { playerInterface } from "../common"
import { responseStatus, response, positiveResponse, negativeResponse } from "../common"

export const ConnectionContext = createContext<Socket | null>(null)

export interface Config {
  selectMode: number
}

export interface PlayerContext {
  thisPlayer: playerInterface | null,
  config: Config,
  setSelectMode: (v: number) => void,
  setPlayer: (p: playerInterface) => void, 
  players: playerInterface[],
  refreshPlayerList: () => void
}
export function unwrap<T>(response: response<T>, handler?: (reason: negativeResponse) => void) {
  if(response.status == responseStatus.OK) {
    return (response as positiveResponse<T>).data || {} as T
  }
  handler ? handler(response) : console.error("response from server: ", response)
  return null
}
export const PlayerContext = createContext<PlayerContext>(
  {
    thisPlayer: null, 
    setPlayer: () => {}, 
    players: [], 
    refreshPlayerList: () => {}, 
    config: {selectMode: 0},
    setSelectMode: (v) => {}
  }
)