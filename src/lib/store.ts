import { configureStore } from '@reduxjs/toolkit';

import contestsSlice from '@/features/contests/contestsSlice';
import authSlice from '@/features/auth/authSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    contests: contestsSlice,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
