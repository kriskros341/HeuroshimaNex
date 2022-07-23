import { NextPage } from "next";
import { useRouter } from "next/router";
import { useContext } from "react";
import { ConnectionContext } from "../components/Contexts";
import style from "../styles/Home.module.css"

const Home: NextPage = () => {
  const router = useRouter()
  const connection = useContext(ConnectionContext)
  const lobby = () => router.replace("/lobby")
  const createGame = () => {
    fetch("http://heuroshimanex.ddns.net:8000/create_game")
      .then(d => d.json())
      .then(d => 
          router.push(`game/${d.gameId}`)
        )

  }
  return (
    <div className={style.mainContainer}>
      <button onClick={lobby}>list</button>
      <button onClick={createGame}>create game</button>
    </div>
  )
}

export default Home