import React, { useState, useEffect } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import krakenWebSocket from '../services/krakenWebSocket';
import { ConnectionState } from '../services/krakenWebSocket';

/**
 * Component to display the current WebSocket connection status
 */
const WebSocketStatus: React.FC = () => {
  const [connectionState, setConnectionState] = useState<string>('unknown');
  const [connectionActive, setConnectionActive] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [messageCount, setMessageCount] = useState<number>(0);

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      const state = krakenWebSocket.getConnectionState();
      setConnectionState(state);
      setConnectionActive(state === ConnectionState.CONNECTED);
    };
    
    // Initial check
    checkConnection();
    
    // Set up interval for checking
    const intervalId = window.setInterval(checkConnection, 2000);
    
    // Set up message counter
    const handleAnyMessage = () => {
      setMessageCount(prev => prev + 1);
      setLastUpdateTime(new Date());
    };
    
    // Add handlers for all channel types
    krakenWebSocket.on('ticker', handleAnyMessage);
    krakenWebSocket.on('ohlc', handleAnyMessage);
    krakenWebSocket.on('trade', handleAnyMessage);
    krakenWebSocket.on('book', handleAnyMessage);
    
    return () => {
      window.clearInterval(intervalId);
      krakenWebSocket.off('ticker', handleAnyMessage);
      krakenWebSocket.off('ohlc', handleAnyMessage);
      krakenWebSocket.off('trade', handleAnyMessage);
      krakenWebSocket.off('book', handleAnyMessage);
    };
  }, []);
  
  // Format time since last update
  const getTimeSinceLastUpdate = () => {
    if (!lastUpdateTime) return 'No updates';
    
    const seconds = Math.floor((new Date().getTime() - lastUpdateTime.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };
  
  // Status text and color based on state
  const getStatusInfo = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return { 
          text: 'Connected', 
          color: '#4caf50',
          description: 'WebSocket is connected and active.'
        };
      case ConnectionState.CONNECTING:
        return { 
          text: 'Connecting', 
          color: '#ff9800',
          description: 'Attempting to establish WebSocket connection...'
        };
      case ConnectionState.RECONNECTING:
        return { 
          text: 'Reconnecting', 
          color: '#ff9800',
          description: 'Connection was lost, attempting to reconnect...'
        };
      case ConnectionState.DISCONNECTED:
        return { 
          text: 'Disconnected', 
          color: '#f44336',
          description: 'WebSocket is disconnected. Data will not update in real-time.'
        };
      case ConnectionState.ERROR:
        return { 
          text: 'Error', 
          color: '#f44336',
          description: 'An error occurred with the WebSocket connection.'
        };
      default:
        return { 
          text: 'Unknown', 
          color: '#9e9e9e',
          description: 'WebSocket connection status is unknown.'
        };
    }
  };
  
  const { text, color, description } = getStatusInfo();
  
  return (
    <Tooltip title={
      <Box sx={{ p: 1 }}>
        <Typography variant="body2">{description}</Typography>
        <Typography variant="body2">Messages received: {messageCount}</Typography>
        <Typography variant="body2">Last update: {getTimeSinceLastUpdate()}</Typography>
      </Box>
    }>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mr: 2,
          border: `1px solid ${color}`,
          borderRadius: '4px',
          px: 1,
          py: 0.5
        }}
      >
        <Box 
          sx={{ 
            width: 10, 
            height: 10, 
            borderRadius: '50%', 
            bgcolor: color,
            mr: 1,
            animation: connectionActive ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': {
                opacity: 0.6,
                transform: 'scale(0.8)'
              },
              '50%': {
                opacity: 1,
                transform: 'scale(1.1)'
              },
              '100%': {
                opacity: 0.6,
                transform: 'scale(0.8)'
              }
            }
          }} 
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          WS: {text}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default WebSocketStatus; 