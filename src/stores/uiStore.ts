import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system'
  
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Modals
  activeModal: string | null
  modalData: any
  
  // Loading states
  globalLoading: boolean
  loadingMessage: string | null
  
  // Notifications
  notifications: Notification[]
  
  // Dashboard preferences
  dashboardLayout: 'grid' | 'list'
  dashboardRefreshInterval: number
  
  // Filters and search
  globalSearch: string
  activeFilters: {
    threats?: any
    entities?: any
    [key: string]: any
  }
  
  // Real-time updates
  realTimeEnabled: boolean
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error'
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
  persistent?: boolean
}

interface UIActions {
  // Theme actions
  setTheme: (theme: UIState['theme']) => void
  toggleTheme: () => void
  
  // Sidebar actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Modal actions
  openModal: (modalId: string, data?: any) => void
  closeModal: () => void
  
  // Loading actions
  setGlobalLoading: (loading: boolean, message?: string) => void
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  
  // Dashboard actions
  setDashboardLayout: (layout: UIState['dashboardLayout']) => void
  setDashboardRefreshInterval: (interval: number) => void
  
  // Search and filter actions
  setGlobalSearch: (search: string) => void
  setActiveFilters: (filters: Record<string, any>) => void
  clearActiveFilters: () => void
  
  // Real-time actions
  setRealTimeEnabled: (enabled: boolean) => void
  setConnectionStatus: (status: UIState['connectionStatus']) => void
}

type UIStore = UIState & UIActions

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: null,
      notifications: [],
      dashboardLayout: 'grid',
      dashboardRefreshInterval: 30000, // 30 seconds
      globalSearch: '',
      activeFilters: {},
      realTimeEnabled: true,
      connectionStatus: 'disconnected',

      // Theme actions
      setTheme: (theme) => {
        set({ theme })
      },

      toggleTheme: () => {
        const { theme } = get()
        const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
        set({ theme: newTheme })
      },

      // Sidebar actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }))
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open })
      },

      toggleSidebarCollapsed: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed })
      },

      // Modal actions
      openModal: (modalId, data) => {
        set({ activeModal: modalId, modalData: data })
      },

      closeModal: () => {
        set({ activeModal: null, modalData: null })
      },

      // Loading actions
      setGlobalLoading: (loading, message) => {
        set({ globalLoading: loading, loadingMessage: message || null })
      },

      // Notification actions
      addNotification: (notification) => {
        const id = crypto.randomUUID()
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          read: false,
        }

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep max 50 notifications
        }))

        // Auto-remove non-persistent notifications after 5 seconds
        if (!notification.persistent) {
          setTimeout(() => {
            get().removeNotification(id)
          }, 5000)
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }))
      },

      clearNotifications: () => {
        set({ notifications: [] })
      },

      // Dashboard actions
      setDashboardLayout: (layout) => {
        set({ dashboardLayout: layout })
      },

      setDashboardRefreshInterval: (interval) => {
        set({ dashboardRefreshInterval: interval })
      },

      // Search and filter actions
      setGlobalSearch: (search) => {
        set({ globalSearch: search })
      },

      setActiveFilters: (filters) => {
        set({ activeFilters: filters })
      },

      clearActiveFilters: () => {
        set({ activeFilters: {} })
      },

      // Real-time actions
      setRealTimeEnabled: (enabled) => {
        set({ realTimeEnabled: enabled })
      },

      setConnectionStatus: (status) => {
        set({ connectionStatus: status })
      },
    }),
    {
      name: 'nexora-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist user preferences
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        dashboardLayout: state.dashboardLayout,
        dashboardRefreshInterval: state.dashboardRefreshInterval,
        realTimeEnabled: state.realTimeEnabled,
      }),
    }
  )
)

// Selectors for better performance
export const useTheme = () => useUIStore((state) => state.theme)
export const useSidebar = () => useUIStore((state) => ({
  open: state.sidebarOpen,
  collapsed: state.sidebarCollapsed,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen,
  toggleCollapsed: state.toggleSidebarCollapsed,
  setCollapsed: state.setSidebarCollapsed,
}))
export const useModal = () => useUIStore((state) => ({
  activeModal: state.activeModal,
  modalData: state.modalData,
  openModal: state.openModal,
  closeModal: state.closeModal,
}))
export const useNotifications = () => useUIStore((state) => ({
  notifications: state.notifications,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  markNotificationRead: state.markNotificationRead,
  clearNotifications: state.clearNotifications,
}))
export const useGlobalLoading = () => useUIStore((state) => ({
  loading: state.globalLoading,
  message: state.loadingMessage,
  setLoading: state.setGlobalLoading,
}))
