import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { createTheme, Theme } from '@mui/material/styles';
import { ChartThemes } from '../types/chartThemes';
import chartThemes from '../config/chartThemes.json';

// Ensure proper typing for the JSON import
const typedChartThemes = chartThemes as ChartThemes;

// Define a type for the theme keys
export type ThemeKey = keyof typeof typedChartThemes;

interface ThemeContextType {
  selectedTheme: ThemeKey;
  setSelectedTheme: (theme: ThemeKey) => void;
  themeData: ChartThemes;
  muiTheme: Theme;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  selectedTheme: 'black',
  setSelectedTheme: () => {},
  themeData: typedChartThemes,
  muiTheme: createTheme()
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Convert chart theme to MUI theme
const createMuiThemeFromChartTheme = (themeKey: ThemeKey): Theme => {
  const chartTheme = typedChartThemes[themeKey];
  
  return createTheme({
    palette: {
      mode: 'dark', // Always dark mode for crypto app
      primary: {
        main: chartTheme.candles.upColor,
      },
      secondary: {
        main: chartTheme.candles.downColor,
      },
      background: {
        default: chartTheme.layout.background === 'transparent' ? '#121212' : chartTheme.layout.background,
        paper: chartTheme.layout.background === 'transparent' ? '#1e1e1e' : chartTheme.layout.background,
      },
      text: {
        primary: chartTheme.layout.textColor,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
            },
          },
        },
      },
    },
  });
};

// Provider component to wrap the app with
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get the stored theme from localStorage or use default
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    // Check if savedTheme exists and is a valid theme key
    return (savedTheme && savedTheme in typedChartThemes) 
      ? savedTheme as ThemeKey 
      : 'black';
  });

  // Create MUI theme based on selected chart theme
  const muiTheme = useMemo(() => 
    createMuiThemeFromChartTheme(selectedTheme),
    [selectedTheme]
  );

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedTheme', selectedTheme as string);
  }, [selectedTheme]);

  const value = {
    selectedTheme,
    setSelectedTheme,
    themeData: typedChartThemes,
    muiTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 