import React, { useState, useEffect } from 'react';
import krakenWebSocket from '../../services/krakenWebSocket';
import { ConnectionState } from '../../services/krakenWebSocket';
import { Button, Box, Typography, Paper, CircularProgress, Chip, Divider, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

const WebSocketDebugger: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [selectedPair, setSelectedPair] = useState('ETH/USD');
  const [channelType, setChannelType] = useState('ohlc');
  const [interval, setInterval] = useState(1);
  
  // Update connection state every second
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const state = (krakenWebSocket as any).getConnectionState();
      setConnectionState(state);
    }, 1000);
    
    return () => window.clearInterval(intervalId);
  }, []);
  
  // Add console listener to capture WebSocket logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Override console.log to capture WebSocket related logs
    console.log = (...args) => {
      originalConsoleLog(...args);
      
      // Only capture WebSocket related logs
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      if (message.includes('WebSocket') || 
          message.includes('WS ') ||
          message.includes('OHLC') ||
          message.includes('subscribe') ||
          message.includes('RAW WS') ||
          message.includes('💬')) {
        setDebugMessages(prev => [...prev, `LOG: ${message}`].slice(-50));
      }
    };
    
    // Override console.error to capture errors
    console.error = (...args) => {
      originalConsoleError(...args);
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      if (message.includes('WebSocket') || 
          message.includes('WS ') || 
          message.includes('subscription') ||
          message.includes('❌')) {
        setDebugMessages(prev => [...prev, `ERROR: ${message}`].slice(-50));
      }
    };
    
    // Override console.warn to capture warnings
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      if (message.includes('WebSocket') || message.includes('WS ')) {
        setDebugMessages(prev => [...prev, `WARN: ${message}`].slice(-50));
      }
    };
    
    return () => {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);
  
  // Handle reconnection
  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      // Use the force reconnect method we added
      await (krakenWebSocket as any).forceReconnect();
      setDebugMessages(prev => [...prev, 'Force reconnect requested!']);
    } catch (error) {
      setDebugMessages(prev => [...prev, `Reconnect error: ${error}`]);
    } finally {
      setIsReconnecting(false);
    }
  };
  
  // Handle subscription
  const handleSubscribe = () => {
    try {
      setDebugMessages(prev => [...prev, `Attempting to subscribe to ${channelType} for ${selectedPair}...`]);
      
      if (channelType === 'ohlc') {
        const success = (krakenWebSocket as any).subscribeOHLC([selectedPair], interval);
        if (success) {
          setDebugMessages(prev => [...prev, `Successfully sent OHLC subscription request for ${selectedPair}`]);
        } else {
          setDebugMessages(prev => [...prev, `Failed to send OHLC subscription request for ${selectedPair}`]);
        }
      } else if (channelType === 'ticker') {
        const success = (krakenWebSocket as any).subscribeTicker([selectedPair]);
        if (success) {
          setDebugMessages(prev => [...prev, `Successfully sent ticker subscription request for ${selectedPair}`]);
        } else {
          setDebugMessages(prev => [...prev, `Failed to send ticker subscription request for ${selectedPair}`]);
        }
      } else if (channelType === 'book') {
        const success = (krakenWebSocket as any).subscribeOrderBook([selectedPair], 10);
        if (success) {
          setDebugMessages(prev => [...prev, `Successfully sent order book subscription request for ${selectedPair}`]);
        } else {
          setDebugMessages(prev => [...prev, `Failed to send order book subscription request for ${selectedPair}`]);
        }
      }
    } catch (error) {
      setDebugMessages(prev => [...prev, `Subscription error: ${error}`]);
    }
  };
  
  const getConnectionStateColor = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return 'success';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'warning';
      case ConnectionState.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Auto-scroll the log to the bottom
  useEffect(() => {
    const logContainer = document.getElementById('ws-debug-log');
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }, [debugMessages]);
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        m: 2, 
        maxWidth: '100%',
        backgroundColor: '#1e1e2d',
        color: '#e0e0e0'
      }}
    >
      <Typography variant="h5" gutterBottom>
        WebSocket Debug Tool
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography sx={{ mr: 2 }}>
          Status:
        </Typography>
        <Chip 
          label={connectionState}
          color={getConnectionStateColor(connectionState) as any}
          sx={{ mr: 2 }}
        />
        <Button 
          variant="contained" 
          color="warning" 
          onClick={handleReconnect}
          disabled={isReconnecting}
          startIcon={isReconnecting ? <CircularProgress size={24} /> : null}
          sx={{ mr: 2 }}
        >
          {isReconnecting ? 'Reconnecting...' : 'Force Reconnect'}
        </Button>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="pair-label">Trading Pair</InputLabel>
          <Select
            labelId="pair-label"
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            label="Trading Pair"
            size="small"
          >
            <MenuItem value="ETH/USD">ETH/USD</MenuItem>
            <MenuItem value="XBT/USD">XBT/USD (BTC)</MenuItem>
            <MenuItem value="SOL/USD">SOL/USD</MenuItem>
            <MenuItem value="ETH/EUR">ETH/EUR</MenuItem>
            <MenuItem value="XBT/EUR">XBT/EUR (BTC)</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="channel-label">Channel</InputLabel>
          <Select
            labelId="channel-label"
            value={channelType}
            onChange={(e) => setChannelType(e.target.value)}
            label="Channel"
            size="small"
          >
            <MenuItem value="ohlc">OHLC</MenuItem>
            <MenuItem value="ticker">Ticker</MenuItem>
            <MenuItem value="book">Order Book</MenuItem>
          </Select>
        </FormControl>
        
        {channelType === 'ohlc' && (
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="interval-label">Interval</InputLabel>
            <Select
              labelId="interval-label"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              label="Interval"
              size="small"
            >
              <MenuItem value={1}>1 minute</MenuItem>
              <MenuItem value={5}>5 minutes</MenuItem>
              <MenuItem value={15}>15 minutes</MenuItem>
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={60}>1 hour</MenuItem>
              <MenuItem value={240}>4 hours</MenuItem>
              <MenuItem value={1440}>1 day</MenuItem>
            </Select>
          </FormControl>
        )}
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubscribe}
        >
          Subscribe
        </Button>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="h6" gutterBottom>
        Debug Log:
      </Typography>
      
      <Box
        id="ws-debug-log"
        sx={{
          height: '400px',
          overflow: 'auto',
          p: 1,
          backgroundColor: '#121212',
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1e1e1e',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#555',
            borderRadius: '4px',
          },
        }}
      >
        {debugMessages.map((message, index) => (
          <Box
            key={index}
            sx={{
              mb: 0.5,
              p: 0.5,
              borderLeft: '3px solid',
              borderColor: 
                message.startsWith('ERROR') ? 'error.main' : 
                message.startsWith('WARN') ? 'warning.main' : 
                'info.main',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message}
          </Box>
        ))}
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => setDebugMessages([])}
          color="error"
          size="small"
        >
          Clear Log
        </Button>
        
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#aaa' }}>
          Note: Log is limited to the 50 most recent WebSocket-related messages.
        </Typography>
      </Box>
    </Paper>
  );
};

export default WebSocketDebugger; 