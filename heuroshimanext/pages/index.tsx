import { NextPage } from "next";
import { useRouter } from "next/router";
import style from "../styles/Home.module.css"

const Home: NextPage = () => {
  const router = useRouter()
  const lobby = () => router.replace("/lobby")
  const game = () => router.replace("/game")
  return (
    <div className={style.mainContainer}>
      <button onClick={lobby}>lobby</button>
      <button onClick={game}>game test</button>
    </div>
  )
}

export default Home