import { Socket, io } from 'socket.io-client'
import { useEffect, useState } from 'react'

export const useSocket = (url: string, cleanup?: () => void) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    const current = io(url)
    current.on("connect", () => console.log("connect"))
    setSocket(current)
    return () => {
      socket?.disconnect()
      cleanup && cleanup()
    }
  }, [])
  return socket
}