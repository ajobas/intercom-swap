// index.js - Jalankan bot di sini

const { getPrice, swapTokens } = require('./utils');

async function main() {
  console.log('Bot PancakeSwap mulai...');

  // UI console sederhana
  console.log('Cek harga sekarang:');
  const price = await getPrice('0.01');
  console.log(`0.01 BNB = ${price} CAKE`);

  // Logic bot: Swap kalau harga > threshold (misal > 0.5 CAKE)
  if (parseFloat(price) > 0.5) {
    console.log('Harga bagus! Mulai swap...');
    await swapTokens();
  } else {
    console.log('Harga kurang bagus, skip swap.');
  }
}

main();
