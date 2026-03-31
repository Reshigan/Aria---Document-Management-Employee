import { create } from 'zustand'

interface SidebarState {
  collapsed: boolean
  mobileOpen: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
  setMobileOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: localStorage.getItem('sidebar-collapsed') === 'true',
  mobileOpen: false,

  toggle: () => set((state) => {
    const newState = !state.collapsed
    localStorage.setItem('sidebar-collapsed', String(newState))
    return { collapsed: newState }
  }),

  setCollapsed: (collapsed) => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
    set({ collapsed })
  },

  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}))
