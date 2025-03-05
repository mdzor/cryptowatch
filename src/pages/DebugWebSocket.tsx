import React from 'react';
import { Typography, Container, Box, Divider, Tabs, Tab } from '@mui/material';
import WebSocketDebugger from '../components/debug/WebSocketDebugger';
import ApiTester from '../components/debug/ApiTester';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`debug-tabpanel-${index}`}
      aria-labelledby={`debug-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DebugWebSocket: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          API Debugging Tools
        </Typography>
        
        <Typography variant="body1" paragraph>
          This page provides tools for diagnosing WebSocket and REST API issues with the Kraken API.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="debug tools tabs">
            <Tab label="WebSocket Debugger" id="debug-tab-0" aria-controls="debug-tabpanel-0" />
            <Tab label="REST API Tester" id="debug-tab-1" aria-controls="debug-tabpanel-1" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <WebSocketDebugger />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ApiTester />
        </TabPanel>
      </Box>
    </Container>
  );
};

export default DebugWebSocket; 