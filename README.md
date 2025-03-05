# Cryptowatch

A modern cryptocurrency trading dashboard and monitoring platform built with React, TypeScript, and Material UI. This application allows users to track cryptocurrency prices, view real-time charts, and monitor market data across different exchanges.

## Project Overview

Cryptowatch provides a customizable dashboard with draggable and resizable chart widgets. Users can monitor multiple trading pairs simultaneously, check orderbook data, and track market movements in real-time through WebSocket connections.

### Key Features

- **Real-time price charts** for various cryptocurrency pairs
- **Responsive grid layout** with draggable and resizable widgets
- **WebSocket integration** for live market data
- **Dark-themed UI** designed for trading environments
- **Redux state management** for application-wide state

## Project Structure

```
cryptowatch/
├── public/             # Static assets and HTML template
├── src/                # Application source code
│   ├── components/     # Reusable UI components
│   │   ├── chart/      # Chart and trading view components
│   │   ├── debug/      # Debugging tools and components
│   │   ├── layout/     # Layout components (header, navigation)
│   │   ├── market/     # Market data display components
│   │   └── trading/    # Trading interface components
│   ├── data/           # Static data and constants
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── services/       # API and WebSocket services
│   ├── store/          # Redux store configuration
│   │   └── slices/     # Redux slices for state management
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

## Folder Descriptions

- **components/**: Reusable UI components organized by functionality
  - **chart/**: Chart widgets and visualization tools
  - **debug/**: Components for debugging and testing WebSocket connections
  - **layout/**: UI layout components including headers and navigation
  - **market/**: Components for displaying market data (prices, volume, etc.)
  - **trading/**: Order placement and trading interface components

- **pages/**: Top-level page components
  - **Dashboard.tsx**: Main dashboard interface
  - **DebugWebSocket.tsx**: Page for debugging WebSocket connections

- **services/**: API integrations and data services
  - **krakenWebSocket.ts**: WebSocket client for Kraken exchange data

- **store/**: Redux state management
  - **slices/**: Redux toolkit slices for different state domains
    - **marketSlice.ts**: Market data state
    - **layoutSlice.ts**: UI layout configuration
    - **userSlice.ts**: User preferences and settings

- **hooks/**: Custom React hooks for shared functionality

- **types/**: TypeScript type definitions for the application

- **utils/**: Helper functions and utilities

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd cryptowatch
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.


## TODO List

- [ ] Implement theme management system (ability to change between 3-4 different themes)
- [ ] Utilize the usePairs hook to download and retrieve the latest trading pair information
- [ ] Enhance UI for pair selection with a search functionality for easier access
- [ ] Add configuration options for adjusting the refresh rate of charts and orderbook data
- [ ] Implement toggle controls for showing/hiding TradingView tools on the charts

