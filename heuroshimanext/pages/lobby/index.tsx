import { NextPage, GetServerSideProps } from "next"
import { useContext, useEffect, useState } from "react"
import { ConnectionContext, unwrap } from "../../components/Contexts"
import { LobbyInterface, response } from "../../common"

const LobbyListItem = (v: LobbyInterface) => {
    console.log(v.players)
    return (
        <div>
            id: {v.id}
        <ul>
            {v.players.map(p => 
                <li>{p.userName}</li>
            )}
        </ul>
            {v.players.length} / {v.maxPlayers}
        <hr />
        </div>
    )
}

const G: NextPage<{data: {lobby: number}}> = (props: {data: {lobby: number}}) => {
    const [lobbies, setLobbies] = useState<LobbyInterface[]>([])
    const connection = useContext(ConnectionContext)
    useEffect(() => {
        connection?.emit("join_global_lobby", (d: response<LobbyInterface[]>) => {
            const r = unwrap(d)
            r && setLobbies(r)
        })
    }, [connection])
    return (
        <div>
            <h1>wybieranie lobby</h1>
            <div>
                {lobbies?.map(v => <LobbyListItem {...v}/>)}
            </div>
        </div>
    )
}

export default G