import React, { useState } from 'react';
import { 
  AppBar, Toolbar, Typography, Box, 
  IconButton, Menu, MenuItem, Button,
  Switch, FormControlLabel, Divider, Badge
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import BugReportIcon from '@mui/icons-material/BugReport';
import { TradingPair } from '../../types/market';

interface HeaderProps {
  children?: React.ReactNode;
  onToggleDebugTools?: () => void;
  onToggleAdvancedDebug?: () => void;
  showDebugTools?: boolean;
  showAdvancedDebug?: boolean;
  onAddChart?: (pair: TradingPair) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  children, 
  onToggleDebugTools, 
  onToggleAdvancedDebug, 
  showDebugTools = false, 
  showAdvancedDebug = false,
  onAddChart
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
    handleSettingsMenuClose();
  };

  const handleSaveLayout = () => {
    console.log('Layout saved');
  };

  const handleLoadLayout = () => {
    console.log('Layout loaded');
  };

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar variant="dense">
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 2 }}>
          Cryptowatch
        </Typography>
        
        <Box sx={{ flexGrow: 1 }}>
          {children}
        </Box>
        
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
          <MenuItem onClick={toggleDarkMode}>Toggle Dark Mode</MenuItem>
          <MenuItem onClick={handleSaveLayout}>Save Layout</MenuItem>
          <MenuItem onClick={handleLoadLayout}>Load Layout</MenuItem>
          <MenuItem onClick={() => {
            handleSettingsMenuClose();
            if (onToggleDebugTools) onToggleDebugTools();
          }}>
            {showDebugTools ? 'Hide Debug' : 'Show Debug'}
          </MenuItem>
        </Menu>
        
        <IconButton onClick={handleUserMenuOpen}>
          <Badge badgeContent={0} color="secondary">
            <AccountCircleIcon />
          </Badge>
        </IconButton>
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
        >
          <MenuItem onClick={handleUserMenuClose}>Profile</MenuItem>
          <MenuItem onClick={handleUserMenuClose}>My Account</MenuItem>
          <MenuItem onClick={handleUserMenuClose}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 