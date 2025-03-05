# WebSocket Tester Component

This component provides a simple interface for testing the WebSocket connection to Kraken's API.

## Usage

1. **Connect**: Click the "Connect" button to establish a WebSocket connection to Kraken.
2. **Test Connection**: Click "Test Connection" to test with a known working pair (XBT/USD).
3. **Subscribe**: Enter a pair symbol and click "Subscribe" to start receiving updates.

## Kraken Pair Formatting for WebSocket API

Kraken WebSocket API uses ISO 4217-A3 format with a slash separator:

- BTC is represented as XBT in Kraken (e.g., XBT/USD, not BTC/USD)
- Other pairs mostly follow standard codes (e.g., ETH/USD, LTC/EUR)
- Common examples:
  - BTC/USD = XBT/USD
  - ETH/USD = ETH/USD
  - BTC/EUR = XBT/EUR

**Note**: This is different from the format used in Kraken's REST API, which uses concatenated names with X/Z prefixes.

## Debugging Tips

1. Check browser console for detailed WebSocket messages
2. Test with known working pairs like XBT/USD and ETH/USD 
3. Verify the symbol format exactly matches what Kraken expects (with slashes)
4. If a subscription fails, try reconnecting before subscribing again

## Common Issues

- Incorrect pair symbol format: Make sure to use ISO format with slashes (e.g., ETH/USD)
- WebSocket not connecting: Check your internet connection and ensure Kraken's API is not experiencing issues
- No data received: Verify the subscription was successful and the pair is actively traded on Kraken 