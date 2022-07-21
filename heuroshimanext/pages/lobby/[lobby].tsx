
import { GetServerSideProps, NextPage } from "next"

export const getServerSideProps: GetServerSideProps = async (context) => {
  console.log(context)

  return {props: {data: context.params}}
}

const G: NextPage<{data: {lobby: number}}> = (props: {data: {lobby: number}}) => {
  console.log(props)
  return <h1>lobby nr {props.data.lobby}</h1>

}

export default G