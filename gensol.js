import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';

// Jumlah wallet yang ingin dibuat
const TOTAL_WALLETS = 100;

// File output
const PRIV_FILE = 'privsol.txt';       // Berisi private key base58 (1 per baris)
const ADDR_FILE = 'addresses.txt';     // Berisi public address (1 per baris)

const privOutput = [];
const addrOutput = [];

for (let i = 0; i < TOTAL_WALLETS; i++) {
  const keypair = Keypair.generate();
  const privKeyBase58 = bs58.encode(keypair.secretKey);
  const pubKey = keypair.publicKey.toBase58();

  privOutput.push(privKeyBase58);
  addrOutput.push(pubKey);

  //console.log(`✅ Wallet ${i + 1}: ${pubKey}`);
}

fs.writeFileSync(PRIV_FILE, privOutput.join('\n'), 'utf-8');
fs.writeFileSync(ADDR_FILE, addrOutput.join('\n'), 'utf-8');

console.log(`\n🔐 ${TOTAL_WALLETS} wallet berhasil dibuat.`);
console.log(`📂 Private keys disimpan di '${PRIV_FILE}'`);
console.log(`📂 Addresses disimpan di '${ADDR_FILE}'`);
