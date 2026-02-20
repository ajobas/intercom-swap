# Simple PancakeSwap Bot

Node.js bot for automatic token swaps on PancakeSwap (BSC). Suitable for beginners learning Web3.

## Features
- Swap BNB to CAKE (or other tokens).
- Check real-time prices.
- Log trades to a file.
- Simple console UI.

## Setup
1. Clone repo: `git clone https://github.com/username/pancakeswap-bot.git`
2. `cd pancakeswap-bot`
3. `npm install`
4. Create `.env` with PRIVATE_KEY and BSC_RPC.
5. Run: `node src/index.js`

## How to Use
- Edit `config.js` for the target token.
- The bot will swap if the price is correct (e.g., above the threshold).

## Warning
Test on the testnet first! The risk of loss lies with the user.

## Contributions
Forks and PRs welcome!
