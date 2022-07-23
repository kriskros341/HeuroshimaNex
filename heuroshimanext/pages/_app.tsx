import '../styles/globals.css'
import type { AppProps } from 'next/app'
import {useRouter} from "next/router"
import { Socket, io } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { ConnectionContext } from '../components/Contexts'


function MyApp({ Component, pageProps }: AppProps) {
  return (
      <Component {...pageProps} />
  )
}

export default MyApp
