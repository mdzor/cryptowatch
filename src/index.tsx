import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Material UI Theme Wrapper Component
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { muiTheme } = useTheme();
  
  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <ThemeWrapper>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeWrapper>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
); 