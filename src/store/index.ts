import { configureStore } from '@reduxjs/toolkit';
import marketReducer from './slices/marketSlice';
import layoutReducer from './slices/layoutSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    market: marketReducer,
    layout: layoutReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 