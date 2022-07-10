import {Hex} from "./hex_toolkit"

export class GameHex extends Hex {
  isTaken: boolean = false
  
  constructor() {
    super()
  }
  take() {
      this.isTaken = true
  }
  unTake() {
    this.isTaken = false
  }
}