import { ethers } from "ethers";
import fs from "fs";

// 1️⃣ 로컬 하드햇 RPC 연결
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// 2️⃣ sFIAT 컨트랙트 주소 (하드햇 실행 시 로그에 뜬 주소)
const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa";

// 3️⃣ 이벤트 ABI 정의
const abi = [
  "event Minted(address indexed to, uint256 amount)",
  "event Redeemed(address indexed from, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];
const iface = new ethers.Interface(abi);

// 4️⃣ CSV 초기화
const file = "events.csv";
fs.writeFileSync(file, "blockNumber,type,address,amount,txHash\n");

console.log("📡 Listening for sFIAT Mint/Redeem/Transfer events...");

// 5️⃣ 로그 필터 설정
const filter = {
  address: tokenAddress,
  topics: [] // 모든 이벤트 대상
};

// 6️⃣ 이벤트 리스너 등록 (v6 방식)
provider.on(filter, (log) => {
  try {
    const parsed = iface.parseLog(log);
    const type = parsed.name;
    const addr = parsed.args[0];
    const amount = parsed.args[1].toString();
    const line = `${log.blockNumber},${type},${addr},${amount},${log.transactionHash}\n`;
    fs.appendFileSync(file, line);
    console.log("🧾", line.trim());
  } catch (err) {
    console.error("⚠️ 로그 파싱 오류:", err.message);
  }
});
