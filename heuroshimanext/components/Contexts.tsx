import { createContext } from "react"
import {Socket} from "socket.io-client"
import { PlayerInterface, TileInterface } from "../common"
import { responseStatus, response, positiveResponse, negativeResponse } from "../common"
import { ActiveCard, InstantAction, TileEntity } from "../unitTypes"

export const ConnectionContext = createContext<Socket | null>(null)

export interface PlayerContext {
    thisPlayer: PlayerInterface | null,
    players: PlayerInterface[],
    refreshPlayerList: () => void
    displayedTile: TileInterface | null
    setDisplayedTile: (v: TileInterface | null) => void
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
        players: [], 
        refreshPlayerList: () => {}, 
        displayedTile: null,
        setDisplayedTile: (v: TileInterface | null) => {}
    }
)