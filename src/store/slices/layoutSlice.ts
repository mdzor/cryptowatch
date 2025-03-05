import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LayoutState {
  darkMode: boolean;
  layouts: Record<string, any>;
  currentLayout: string;
}

const initialState: LayoutState = {
  darkMode: true,
  layouts: {
    default: {
      // Default layout configuration
    },
  },
  currentLayout: 'default',
};

export const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    saveLayout: (state, action: PayloadAction<{ name: string; layout: any }>) => {
      state.layouts[action.payload.name] = action.payload.layout;
    },
    setCurrentLayout: (state, action: PayloadAction<string>) => {
      state.currentLayout = action.payload;
    },
  },
});

export const { toggleDarkMode, saveLayout, setCurrentLayout } = layoutSlice.actions;

export default layoutSlice.reducer; 