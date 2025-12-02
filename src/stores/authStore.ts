import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, AuthTokens, LoginRequest, LoginResponse } from '@/types/api.types'
import { apiPost, storeTokens, clearTokens, getStoredTokens } from '@/services/api'

interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  refreshAuth: () => Promise<void>
  clearError: () => void
  setUser: (user: User) => void
  updateUserPreferences: (preferences: Partial<User['preferences']>) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiPost<LoginResponse>('/auth/login', credentials)
          
          if (response.requiresMfa) {
            // Handle MFA flow - for now, throw error to indicate MFA required
            set({ 
              isLoading: false, 
              error: 'MFA required. Please implement MFA flow.' 
            })
            return
          }

          // Store tokens securely
          storeTokens(response.tokens)
          
          set({
            user: response.user,
            tokens: response.tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
            user: null,
            tokens: null,
          })
          clearTokens()
        }
      },

      logout: () => {
        clearTokens()
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        })
      },

      refreshAuth: async () => {
        const storedTokens = getStoredTokens()
        
        if (!storedTokens) {
          get().logout()
          return
        }

        try {
          // Verify token is still valid by fetching user profile
          const user = await apiPost<User>('/auth/profile')
          
          set({
            user,
            tokens: storedTokens,
            isAuthenticated: true,
            error: null,
          })
        } catch (error) {
          // Token is invalid, logout
          get().logout()
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setUser: (user: User) => {
        set({ user })
      },

      updateUserPreferences: (preferences: Partial<User['preferences']>) => {
        const { user } = get()
        if (user) {
          set({
            user: {
              ...user,
              preferences: {
                ...user.preferences,
                ...preferences,
              },
            },
          })
        }
      },
    }),
    {
      name: 'nexora-auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user data, not tokens (tokens are handled separately)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
export const useAuthError = () => useAuthStore((state) => state.error)
