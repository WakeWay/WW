import { create } from 'zustand';
import { AppError } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: AppError | null;
  otpSent: boolean;
  token: string | null;
}

interface AuthActions {
  requestOtp: (email: string, reason?: 'login' | 'deactivate' | 'signup') => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  deactivateAccount: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  resetOtpState: () => void;
}

// Ensure this matches your backend IP or localhost! 
// Note: If testing on a physical android device, you may need to replace localhost with your computer's local IP address (e.g. 192.168.1.16)
const API_URL = 'https://wakeway.onrender.com/api';

const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  return domain ? `${name.slice(0, 2)}***@${domain}` : 'invalid-email';
};

const initialState: AuthState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
  otpSent: false,
  token: null,
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,

  requestOtp: async (email, reason = 'login') => {
    set({ isLoading: true, error: null });
    console.log('[OTP] Requesting code', { url: `${API_URL}/auth/request-otp`, email: maskEmail(email), reason });
    try {
      const res = await fetch(`${API_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason }),
      });
      const data = await res.json();
      console.log('[OTP] Request response', { status: res.status, ok: res.ok, error: data.error });
      if (!res.ok) throw new Error(data.error || 'Failed to request OTP');
      
      set({ otpSent: true, isLoading: false });
    } catch (err: any) {
      console.error('[OTP] Request failed', err?.message || err);
      set({ error: { message: err.message, code: 'auth/failed', timestamp: Date.now() }, isLoading: false });
    }
  },

  verifyOtp: async (email, otp) => {
    set({ isLoading: true, error: null });
    console.log('[OTP] Verifying code', { url: `${API_URL}/auth/verify-otp`, email: maskEmail(email) });
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      console.log('[OTP] Verify response', { status: res.status, ok: res.ok, error: data.error });
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      await AsyncStorage.setItem('@auth_token', data.token);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(data.user));

      // Wipe any old device ghost data before dropping into new auth state!
      require('./useTripStore').useTripStore.getState().clearSessionData();

      set({ 
        user: data.user, 
        token: data.token,
        isLoggedIn: true, 
        isLoading: false, 
        otpSent: false 
      });

      // Synchronize with the cloud to immediately pull down trips for the new user!
      require('./useTripStore').useTripStore.getState().restoreAppState();
    } catch (err: any) {
      console.error('[OTP] Verify failed', err?.message || err);
      set({ error: { message: err.message, code: 'auth/failed', timestamp: Date.now() }, isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
      require('./useTripStore').useTripStore.getState().clearSessionData();
      set({ ...initialState });
    } catch (err) {
      console.error('Logout error', err);
      set({ ...initialState });
    }
  },

  deactivateAccount: async (otp) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = get();
      if (!user || !token) throw new Error('Not logged in');

      const res = await fetch(`${API_URL}/auth/deactivate`, {
        method: 'POST',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deactivation failed');
      
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
      require('./useTripStore').useTripStore.getState().clearAppData();
      set({ ...initialState });
    } catch (err: any) {
      set({ error: { message: err.message, code: 'auth/failed', timestamp: Date.now() }, isLoading: false });
      throw err;
    }
  },

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const userStr = await AsyncStorage.getItem('@auth_user');
      if (token && userStr) {
        set({
          user: JSON.parse(userStr),
          token,
          isLoggedIn: true,
        });
      }
    } catch (e) {
      console.error('Failed to restore session');
    }
  },

  clearError: () => set({ error: null }),
  resetOtpState: () => set({ otpSent: false, error: null }),
}));
