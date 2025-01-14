import {BitcoinWallet } from './src/wallet/wallet.js';





// Need to wrap in an async function since top-level await might not be available
async function init() {
    const wallet = new BitcoinWallet();
    try {
       // const seed = await wallet.generateSeed();
      //  console.log('Generated seed:', seed.mnemonic);
      //  wallet.connect()

    await wallet.createWallet('s')
    console.log('---- connected create')
  // const s  = await wallet.generateAddress()
  // console.log(s)
    } catch (error) {
        console.error('Error generating seed:', error);
    }
}

init();