// utils.js - Fungsi bantu untuk swap dan check

const { ethers } = require('ethers');
const config = require('./config');
const fs = require('fs'); // Untuk log

// Connect ke wallet dan provider
const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.privateKey, provider);

// PancakeSwap ABI sederhana (hanya swap function)
const pancakeAbi = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'
];

// Connect ke router
const router = new ethers.Contract(config.pancakeRouter, pancakeAbi, wallet);

// Fungsi cek harga estimasi
async function getPrice(amountIn) {
  const path = [config.wbnbAddress, config.cakeAddress];
  const amounts = await router.getAmountsOut(ethers.utils.parseEther(amountIn), path);
  return ethers.utils.formatEther(amounts[1]); // Output CAKE
}

// Fungsi swap
async function swapTokens() {
  try {
    const amountIn = config.amountToSwap;
    const estimatedOut = await getPrice(amountIn);
    const amountOutMin = ethers.utils.parseEther(estimatedOut).mul(100 - config.slippage).div(100); // Hitung min out

    const path = [config.wbnbAddress, config.cakeAddress];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 menit

    const tx = await router.swapExactETHForTokens(
      amountOutMin,
      path,
      wallet.address,
      deadline,
      { value: ethers.utils.parseEther(amountIn), gasLimit: 300000 }
    );

    await tx.wait();
    console.log('Swap sukses! TX:', tx.hash);

    // Log ke file
    fs.appendFileSync('./data/trades.log', `Swap ${amountIn} BNB to ${estimatedOut} CAKE at ${new Date()}\n`);
  } catch (error) {
    console.error('Swap gagal:', error);
  }
}

module.exports = { getPrice, swapTokens };
