import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import fs from "fs-extra";

const FILE_ADDRESS = 'addrsol.txt';
const FILE_EMAIL = 'email.txt';
const MAX_ATA_RETRIES = 50;
const MAX_LOGIN_RETRIES = 5;
const RETRY_DELAY = 1000; // ms

const PROXY = 'http://td-customer-ainsoft-country-sg:ainsoft123@k2hvn5xr.as.thordata.net:9999';
const agent = new HttpsProxyAgent(PROXY);

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginWithRetry(email, password, taskId) {
  for (let attempt = 1; attempt <= MAX_LOGIN_RETRIES; attempt++) {
    console.log(`[${taskId}] 🔐 Login attempt ${attempt} dengan email: ${email}`);
    try {
      const res = await axios.post("https://ec2.tomatok.net/api/account/email/login", {
        email, password,
        fcmToken: "6CGDfGBSCq5Js1k1uyGjX:APA91bF_ueV1gB5LfqWi0GBytXi68jg7fdQ10tJ2YjYabBzUFHQOV19kaethN_If5_B5oPd-IehSfnYfJsS4GhAsccbxMtdEN-y6R3_w1cyhLtsrJxa4f3c",
      }, {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'user-agent': 'Dart/3.7 (dart:io)',
          'host': 'ec2.tomatok.net'
        },
        httpsAgent: agent
      });

      const token = res.data?.data?.access_token;
      if (!token) throw new Error("Token kosong");

      console.log(`[${taskId}] ✅ Login sukses.`);
      return token;
    } catch (err) {
      console.log(`[${taskId}] ❌ Gagal login:`, err.response?.status || err.message);
      await delay(RETRY_DELAY);
    }
  }
  return null;
}

async function createAtaWalletWithRetry(ownerAddress, headers, taskId = "") {
  const walletPayload = { owner_address: ownerAddress };

  for (let attempt = 1; attempt <= MAX_ATA_RETRIES; attempt++) {
    try {
      console.log(`  └──> [${taskId}] Kirim ATA (Attempt ${attempt})`);
      const res = await axios.post("https://ec2.tomatok.net/api/wallet/create/ata/v2", walletPayload, {
        headers, httpsAgent: agent
      });

      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      console.log(`     ✅ ATA berhasil: ${res.status} -`, res.data);
      return true;
    } catch (err) {
      if (err.code === 'ECONNRESET') {
        console.log(`     ⚠️ ECONNRESET terdeteksi, skip address ini.`);
        return false; // langsung skip tanpa retry
      }
      console.log(`     [!] Gagal ATA (${err.message}) - retrying...`);
      await delay(RETRY_DELAY);
    }
  }

  return false;
}


(async () => {
  let ownerAddresses;
  try {
    ownerAddresses = (await fs.readFile(FILE_ADDRESS, 'utf8'))
      .split('\n').map(a => a.trim()).filter(Boolean);
    if (!ownerAddresses.length) throw new Error('Empty address list');
  } catch {
    console.error(`❌ File '${FILE_ADDRESS}' tidak ditemukan atau kosong.`);
    process.exit(1);
  }

  let email;
  try {
    email = (await fs.readFile(FILE_EMAIL, 'utf8'))
      .split('\n').map(e => e.trim()).filter(Boolean)[0];
    if (!email) throw new Error('Email kosong');
  } catch {
    console.error(`❌ File '${FILE_EMAIL}' tidak ditemukan atau kosong.`);
    process.exit(1);
  }

  const password = "@Haidar123";

  for (let i = 0; i < ownerAddresses.length; i++) {
    const owner = ownerAddresses[i];
    const taskId = `#${i + 1}`;
    console.log(`\n--- Proses ${taskId}: ${owner} ---`);

    const token = await loginWithRetry(email, password, taskId);
    if (!token) {
      console.log(`[✗] ${taskId} Gagal login setelah retry, skip!`);
      continue;
    }

    const headers = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'user-agent': 'Dart/3.7 (dart:io)',
      'host': 'ec2.tomatok.net',
      'xchecker': 'a2hqbzFpMzRqMjEsbm0sLmN2bXBvZmktMW8ybG1ubHdtZjE0MTI0MTI0',
      'authorization': token
    };

    const success = await createAtaWalletWithRetry(owner, headers, taskId);
    if (success) {
      console.log(`[✓] Sukses buat ATA untuk ${owner}`);
    } else {
      console.log(`[✗] Gagal buat ATA untuk ${owner} setelah retry.`);
    }

    console.log('-'.repeat(60));
    await delay(5000);
  }

  console.log('\n✅ Semua proses selesai.');
})();
