import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Profile } from '@/features/contests/types';
import type { AuthUser } from '@/services/authService';

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  profile: Profile | null;
  isInitialized: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  profile: null,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: AuthUser; profile: Profile }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.profile = action.payload.profile;
      state.isInitialized = true;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.profile = null;
      state.isInitialized = true;
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    }
  },
});

export const { setAuth, clearAuth, setInitialized } = authSlice.actions;

export default authSlice.reducer;
