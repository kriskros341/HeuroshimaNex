import create from 'zustand'
import { ActiveCard, EntityType } from '../unitTypes'


interface handStoreInterface {
  active: ActiveCard | null
  isBasePlaced: boolean
  placeBase: () => void
  setActive: (v: ActiveCard | null) => void 
}

export const useHandStore = create<handStoreInterface>(set => ({
  isBasePlaced: false, 
  active: null,
  placeBase: () => set(() => ({isBasePlaced: true})),
  setActive: (card: ActiveCard | null) => set(() => ({
    active: card,
  }))
}))