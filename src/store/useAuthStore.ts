import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError } from '@/types';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: AppError | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

type AuthStoreType = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthStoreType>((set) => ({
  ...initialState,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // MOCK LOGIN LOGIC
      // In a real app, this makes a network request.
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network

      // For local testing, we check AsyncStorage to see if they signed up
      const mockUsersStr = await AsyncStorage.getItem('@mock_users');
      let foundUser = null;
      
      if (mockUsersStr) {
        const mockUsers = JSON.parse(mockUsersStr);
        const user = mockUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (user) {
          foundUser = { id: user.id, name: user.name, email: user.email };
        }
      }

      // Hardcoded fallback for testing if no users exist
      if (!foundUser && email === 'test@wakeway.com' && password === 'password') {
        foundUser = { id: '1', name: 'Test User', email: 'test@wakeway.com' };
      }

      if (!foundUser) {
        throw new Error('Invalid email or password');
      }

      await AsyncStorage.setItem('@auth_session', JSON.stringify(foundUser));
      set({ user: foundUser, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: { message: err.message, code: 'auth/failed' }, isLoading: false });
    }
  },

  signup: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network

      const mockUsersStr = await AsyncStorage.getItem('@mock_users') || '[]';
      const mockUsers = JSON.parse(mockUsersStr);

      if (mockUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email is already registered!');
      }

      const newUser = { id: Date.now().toString(), name, email, password };
      mockUsers.push(newUser);
      await AsyncStorage.setItem('@mock_users', JSON.stringify(mockUsers));

      const authUser = { id: newUser.id, name: newUser.name, email: newUser.email };
      await AsyncStorage.setItem('@auth_session', JSON.stringify(authUser));
      
      set({ user: authUser, isLoggedIn: true, isLoading: false });
    } catch (err: any) {
      set({ error: { message: err.message, code: 'auth/failed' }, isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AsyncStorage.removeItem('@auth_session');
      set({ ...initialState });
    } catch (err) {
      console.error('Logout error', err);
      // Still log out locally
      set({ ...initialState });
    }
  },

  restoreSession: async () => {
    try {
      const sessionStr = await AsyncStorage.getItem('@auth_session');
      if (sessionStr) {
        const user = JSON.parse(sessionStr);
        set({ user, isLoggedIn: true });
      }
    } catch (e) {
      console.error('Failed to restore session');
    }
  },

  clearError: () => set({ error: null }),
}));
