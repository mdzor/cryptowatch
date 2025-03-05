import React, { useState } from 'react';
import { 
  AppBar, Toolbar, Typography, Box, 
  IconButton, Menu, MenuItem, Button,
  Switch, FormControlLabel, Divider, Badge
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PaletteIcon from '@mui/icons-material/Palette';
import { TradingPair } from '../../types/market';
import { useTheme } from '../../context/ThemeContext';

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
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);
  const { selectedTheme, setSelectedTheme, themeData } = useTheme();

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

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme as any);
    handleThemeMenuClose();
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
        
        {/* Theme Menu */}
        <IconButton onClick={handleThemeMenuOpen} sx={{ mr: 1 }}>
          <PaletteIcon />
        </IconButton>
        <Menu
          anchorEl={themeMenuAnchor}
          open={Boolean(themeMenuAnchor)}
          onClose={handleThemeMenuClose}
        >
          {Object.entries(themeData).map(([key, theme]) => (
            <MenuItem 
              key={key} 
              onClick={() => handleThemeChange(key)}
              selected={selectedTheme === key}
            >
              {theme.name}
            </MenuItem>
          ))}
        </Menu>
        
        <IconButton onClick={handleSettingsMenuOpen} sx={{ mr: 1 }}>
          <SettingsIcon />
        </IconButton>
        <Menu
          anchorEl={settingsMenuAnchor}
          open={Boolean(settingsMenuAnchor)}
          onClose={handleSettingsMenuClose}
        >
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