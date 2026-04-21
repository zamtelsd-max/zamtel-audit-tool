import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, UserRole } from '../types';

const storedToken = localStorage.getItem('zamtel_token');
const storedUser = localStorage.getItem('zamtel_user');

const initialState: AuthState = {
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!storedToken,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        user: { id: string; staffId: string; name: string; role: UserRole; province?: string; zone?: string };
      }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('zamtel_token', action.payload.token);
      localStorage.setItem('zamtel_user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('zamtel_token');
      localStorage.removeItem('zamtel_user');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
