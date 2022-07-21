import '../styles/globals.css'
import type { AppProps } from 'next/app'
import {useRouter} from "next/router"
import { Socket, io } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { ConnectionContext } from '../components/Contexts'

const useSocket = (url: string, cleanup?: () => void) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    const current = io(url)
    current.on("connect", () => console.log("connect"))
    setSocket(current)
    return () => {
      socket?.disconnect()
    }
  }, [])
  return socket
}

const WithWS = (props: any) => {
  const connection = useSocket("http://heuroshimanex.ddns.net:8000/")
  return (
    <ConnectionContext.Provider value={connection}>
      {props.children}
    </ConnectionContext.Provider>
  )
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  if(router.pathname.startsWith("/lobby") || router.pathname.startsWith("/game"))
    return (
      <WithWS>
        <Component {...pageProps} />
      </WithWS>
    )
  return (
      <Component {...pageProps} />
  )
}

export default MyApp
