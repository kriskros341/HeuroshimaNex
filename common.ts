import {Hex, vec2} from "./hex_toolkit"

export enum TileBuild{
  free,
  army,
  obstacle,
  base
}

export interface response<T> {
  status: string
  data?: T;
}

export interface tileInterface {
  ownerId: string | undefined
  buildType: TileBuild
}

export interface buildStructureInterface {
  tile: vec2
  type: TileBuild
  playerId: string
}

export class GameHex extends Hex {
  isTaken: boolean = false
  tileBuild:TileBuild=TileBuild.free
  owner: Player | undefined
  setOwner(player: Player) {
    this.owner = player
  }
  reset() {
    this.tileBuild = TileBuild.free
    this.isTaken = false
    this.owner = undefined
    this.clearOwner()
  }
  loadState(state: tileInterface) : void {
    this.owner = Player.getById(state.ownerId)
    this.tileBuild = state.buildType
    this.isTaken = state.buildType == TileBuild.free ? false : true
  }
  serialize() : tileInterface {
    return {
      ownerId: this.owner?.id,
      buildType: this.tileBuild
    }
  }
  clearOwner() {
    this.owner = undefined
  }
  isTargetted: boolean = false;
  constructor() {
    super()
  }
  build(type:TileBuild) {
      this.tileBuild=type
  }
}

const getRandomColor = (): [number, number, number] => {
  return [
    Math.random()*255,
    Math.random()*255,
    Math.random()*255
  ]
}

export class Player {
  static objects: Player[] = []
  static getById(id?: string) {
    return id ? Player.objects.find(player => player.id == id) : undefined
  }
  color: [number, number, number] | undefined
  id: string
  constructor(id: string, color?: [number, number, number]) {
    this.id = id
    this.color = color ? color : getRandomColor()
    Player.objects.push(this)
  } 
  setColor(value: [number, number, number]) {
    this.color = value
  }
}