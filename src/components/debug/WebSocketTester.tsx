import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import krakenWebSocket from '../../services/krakenWebSocket';

const WebSocketTester: React.FC = () => {
  const [status, setStatus] = useState<string>('Not connected');
  const [messages, setMessages] = useState<string[]>([]);
  const [customPair, setCustomPair] = useState<string>('ETH/USD');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useRawMessage, setUseRawMessage] = useState(false);
  
  // Handler to test the connection
  const handleTestConnection = async () => {
    setStatus('Testing connection...');
    setError(null);
    try {
      await krakenWebSocket.testConnection();
      setStatus('Test connection successful');
      setIsConnected(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      setStatus(`Test connection failed: ${errorMessage}`);
      setError(`Connection test failed: ${errorMessage}. Check console for details.`);
      setIsConnected(false);
      
      // Log detailed error info to console
      console.error('WebSocket test connection error:', error);
    }
  };
  
  // Handler to connect/disconnect
  const handleConnection = async () => {
    setError(null);
    if (isConnected) {
      // Disconnect
      krakenWebSocket.disconnect();
      setStatus('Disconnected');
      setIsConnected(false);
    } else {
      // Connect
      setStatus('Connecting...');
      try {
        await krakenWebSocket.connect();
        setStatus('Connected');
        setIsConnected(true);
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        setStatus(`Connection failed: ${errorMessage}`);
        setError(`Failed to connect: ${errorMessage}. Check console for details.`);
        
        // Log detailed error info to console
        console.error('WebSocket connection error:', error);
      }
    }
  };
  
  // Handler to subscribe to a custom pair
  const handleSubscribe = () => {
    setError(null);
    if (!isConnected) {
      setStatus('Not connected');
      setError('Please connect to WebSocket first');
      return;
    }
    
    setStatus(`Subscribing to ${customPair}...`);
    
    // Register message handler
    const handler = (data: any) => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
      setMessages(prev => [`${timestamp} - ${JSON.stringify(data).slice(0, 100)}...`, ...prev.slice(0, 9)]);
    };
    
    // Subscribe using direct message if selected
    let success = false;
    
    if (useRawMessage) {
      // Use raw subscription message
      const rawMessage = {
        event: 'subscribe',
        pair: [customPair],
        subscription: {
          name: 'ticker'
        }
      };
      
      console.log('Sending raw subscription:', rawMessage);
      krakenWebSocket.on('ticker', handler);
      success = krakenWebSocket.send(rawMessage);
    } else {
      // Use helper method
      krakenWebSocket.on('ticker', handler);
      success = krakenWebSocket.subscribeTicker([customPair]);
    }
    
    if (success) {
      setStatus(`Subscribed to ${customPair}`);
    } else {
      setStatus(`Failed to subscribe to ${customPair}`);
      setError(`Failed to send subscription message for ${customPair}`);
      krakenWebSocket.off('ticker', handler);
    }
  };
  
  // Component cleanup
  useEffect(() => {
    return () => {
      krakenWebSocket.disconnect();
    };
  }, []);
  
  return (
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        WebSocket Connection Tester
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Use this tool to test the Kraken WebSocket connection. Kraken WebSocket API uses ISO 4217-A3 format with a slash,
        like "XBT/USD" for Bitcoin/USD or "ETH/USD" for Ethereum/USD. Check the browser console for detailed logs.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Status: {status}
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={handleTestConnection}
          sx={{ mr: 1, mt: 1 }}
        >
          Test Connection
        </Button>
        
        <Button 
          variant="contained" 
          color={isConnected ? "error" : "primary"}
          onClick={handleConnection}
          sx={{ mr: 1, mt: 1 }}
        >
          {isConnected ? "Disconnect" : "Connect"}
        </Button>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <TextField
            label="Pair Symbol"
            value={customPair}
            onChange={(e) => setCustomPair(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ mr: 2 }}
            helperText="Use ISO format with slash (e.g., ETH/USD)"
          />
          
          <Button 
            variant="contained" 
            onClick={handleSubscribe}
            disabled={!isConnected}
          >
            Subscribe
          </Button>
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={useRawMessage}
              onChange={(e) => setUseRawMessage(e.target.checked)}
              size="small"
            />
          }
          label="Use Raw Message Format"
        />
      </Box>
      
      <Typography variant="subtitle2" gutterBottom>
        Recent Messages:
      </Typography>
      
      <Box 
        sx={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          bgcolor: '#f5f5f5', 
          p: 1,
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.8rem'
        }}
      >
        {messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No messages yet. Connect and subscribe to see data.
          </Typography>
        ) : (
          messages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))
        )}
      </Box>
    </Box>
  );
};

export default WebSocketTester; 