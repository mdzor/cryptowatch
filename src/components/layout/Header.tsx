import React, { useState } from 'react';
import { 
  AppBar, Toolbar, Typography, Box, 
  IconButton, Menu, MenuItem, Button,
  Switch, FormControlLabel, Divider
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import BugReportIcon from '@mui/icons-material/BugReport';

interface HeaderProps {
  children?: React.ReactNode;
  onToggleDebugTools?: () => void;
  onToggleAdvancedDebug?: () => void;
  showDebugTools?: boolean;
  showAdvancedDebug?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  children, 
  onToggleDebugTools, 
  onToggleAdvancedDebug, 
  showDebugTools = false, 
  showAdvancedDebug = false 
}) => {
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);
  const [darkMode, setDarkMode] = useState(true);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // In a real app, this would trigger a theme change
  };

  const handleSaveLayout = () => {
    // In a real app, this would save the layout to localStorage or a backend
    console.log('Layout saved');
  };

  const handleLoadLayout = () => {
    // In a real app, this would load a saved layout
    console.log('Layout loaded');
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense">
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 2 }}>
          Cryptowatch
        </Typography>
        
        {children}
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button 
          startIcon={<SaveIcon />} 
          size="small" 
          onClick={handleSaveLayout}
          sx={{ mr: 1 }}
        >
          Save Layout
        </Button>
        
        <Button 
          startIcon={<RestoreIcon />} 
          size="small" 
          onClick={handleLoadLayout}
          sx={{ mr: 2 }}
        >
          Load Layout
        </Button>
        
        <IconButton onClick={toggleDarkMode} sx={{ mr: 1 }}>
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
        
        <IconButton onClick={handleSettingsMenuOpen} sx={{ mr: 1 }}>
          <SettingsIcon />
        </IconButton>
        <Menu
          anchorEl={settingsMenuAnchor}
          open={Boolean(settingsMenuAnchor)}
          onClose={handleSettingsMenuClose}
        >
          <MenuItem>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={toggleDarkMode}
                  size="small"
                />
              }
              label="Dark Mode"
            />
          </MenuItem>
          <MenuItem onClick={handleSettingsMenuClose}>Chart Settings</MenuItem>
          <MenuItem onClick={handleSettingsMenuClose}>API Configuration</MenuItem>
          
          {onToggleDebugTools && (
            <>
              <Divider />
              <MenuItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showDebugTools}
                      onChange={onToggleDebugTools}
                      size="small"
                      color="error"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BugReportIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
                      <Typography variant="body2" color="error">Debug Tools</Typography>
                    </Box>
                  }
                />
              </MenuItem>
              {onToggleAdvancedDebug && (
                <MenuItem 
                  disabled={!showDebugTools}
                  onClick={onToggleAdvancedDebug}
                  sx={{ 
                    pl: 4,
                    color: showAdvancedDebug ? 'error.main' : 'inherit',
                    fontWeight: showAdvancedDebug ? 'bold' : 'normal'
                  }}
                >
                  {showAdvancedDebug ? 'Hide Advanced Debug' : 'Advanced Debug'}
                </MenuItem>
              )}
            </>
          )}
        </Menu>
        
        <IconButton onClick={handleUserMenuOpen}>
          <AccountCircleIcon />
        </IconButton>
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
        >
          <MenuItem onClick={handleUserMenuClose}>Profile</MenuItem>
          <MenuItem onClick={handleUserMenuClose}>API Keys</MenuItem>
          <MenuItem onClick={handleUserMenuClose}>Settings</MenuItem>
          <MenuItem onClick={handleUserMenuClose}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 