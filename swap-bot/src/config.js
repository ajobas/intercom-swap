// config.js - Setting bot untuk pemula, edit di sini aja

require('dotenv').config(); // Load .env

module.exports = {
  privateKey: process.env.PRIVATE_KEY, // Jangan hardcode!
  rpcUrl: process.env.BSC_RPC,
  pancakeRouter: '0x10ED43C718714eb63d5aA57Df2dC99b65Dfa924', // Alamat PancakeSwap Router V2
  wbnbAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB token
  cakeAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE token (ganti kalau mau token lain)
  amountToSwap: '0.01', // Jumlah BNB untuk swap (string, dalam ether)
  slippage: 5, // Toleransi slippage (persen)
};
