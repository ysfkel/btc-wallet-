import BIP39Seed from "wallet-seed-bip39";
import { WalletStoreHyperbee } from "lib-wallet-store";
import { Peer } from "../p2p/swarm.js";
import crypto from "crypto";
import { BitcoinPay, KeyManager } from "lib-wallet-pay-btc";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { join } from "path";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BitcoinWallet {
  constructor() {}
  async createWallet(password, mnemonic) {
    try {
      if (!password) {
        throw new Error("Password required");
      }

      this.store = new WalletStoreHyperbee({
        store_path: "./wallet-store",
      });

      this.store.init();

      const seed = await this.generateSeed(mnemonic);
      const topic = deriveDiscoveryKey(seed.mnemonic);
      this.connect(topic);
      this.btcPay = await this.initBtcPay();
      const encrypted = await encryptSeed(seed, password);
      await saveEncryptedSeed(encrypted);
    } catch (error) {
      console.error("Error in createWallet:", error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  async generateSeed(mnemonic) {
    const seed = await BIP39Seed.generate(mnemonic);

    return seed;
  }

  async sendTransaction(amount, address) {
    const send = await this.btcPay.sendTransaction(
      {},
      {
        amount,
        address,
      },
    );
  }

  async getBalance(address) {
    if (!address) {
      throw new Error("Null address");
    }
    const balance = await this.btcPay.getBalance({}, { address });
    return balance;
  }

  async connect(topic) {
    const peer = new Peer();
    peer.connect(topic, this.store.db.feed);
  }

  async generateAddress() {
    this.address = await this.btcPay.getNewAddress();
  }

  async initBtcPay(seed) {
     try{
      const km = new KeyManager({
        seed,
      });
      await km.init();
  
      const btcPay = new BitcoinPay({
        // Asset name space
        asset_name: "btc",
        // Asset's network
        network: "regtest",
        key_manager: km,
        store: this.store, 
        electrum: {
          host: "smmalis37.ddns.net", // Public testnet server
          port: 50001,
          protocol: "tcp",
          timeout: 10000, // Increase timeout to 20 seconds
        },
      });
  
      await btcPay.initialize();
      return btcPay;
     }catch(e){
      console.error("Error in initBtcPay:", error);
      throw new Error(`Failed to initialize BitcoinPay: ${error.message}`);
     }
  }
}

function deriveDiscoveryKey(mnemonic) {
  // Using Node's built-in crypto
  return crypto
    .createHash("sha256")
    .update("bitcoin-wallet-v1")
    .update(mnemonic)
    .digest();
}

async function encryptSeed(seed, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const iv = crypto.randomBytes(16);
  const seedString = seed.toString("hex"); // Con

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(seedString, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

async function saveEncryptedSeed(encryptedData) {
  const walletDir = join(__dirname, "..", "..", "wallet-data");
  const seedPath = join(walletDir, "encrypted-seed.json");

  try {
    // Create wallet directory if it doesn't exist
    await fs.mkdir(walletDir, { recursive: true });

    // Save encrypted data
    await fs.writeFile(seedPath, JSON.stringify(encryptedData));
  } catch (error) {
    console.error("Save error:", error);
    throw new Error(`Failed to save encrypted seed: ${error.message}`);
  }
}

// Load encrypted seed from disk 