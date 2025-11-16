import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config as dotenv } from "dotenv";
import { ethers } from "ethers";
import fs from "fs";

dotenv(); // .env 로드

const app = express();
app.use(cors()); // ✅ CORS 허용
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(".")); // 정적 파일 제공

const {
  RPC_URL,
  PRIVATE_KEY,
  TOKEN_ADDRESS,
  DECIMALS = "18",
  PORT = "4000",
} = process.env;

if (!RPC_URL || !PRIVATE_KEY || !TOKEN_ADDRESS) {
  console.error("❌ .env 설정이 비었습니다. (RPC_URL / PRIVATE_KEY / TOKEN_ADDRESS)");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ABI = [
  "function setAllowed(address who, bool ok) external",
  "function mint(address to, uint256 amount, string meta) external",
  "function requestRedeem(bytes32 requestId, uint256 amount, string meta) external",
  "function fulfillRedeem(bytes32 requestId, address user, uint256 amount, string meta) external",
  "function balanceOf(address) view returns (uint256)",
  "event Minted(address indexed to, uint256 amount, string meta)",
  "event RedeemRequested(address indexed user, bytes32 requestId, uint256 amount, string meta)",
  "event RedeemFulfilled(bytes32 requestId, address indexed user, uint256 amount, string meta)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);
const toUnits = (amt) => ethers.parseUnits(String(amt), Number(DECIMALS));

/** 💹 실시간 KRW 가격 데이터 (JSON 파일 기반) */
/** 💹 실시간 KRW 가격 데이터 (자동 시뮬레이션) */
app.get("/price-feed", (req, res) => {
  try {
    const now = Date.now();

    // 10개의 최근 시점 데이터 생성 (1분 간격)
    const data = Array.from({ length: 10 }).map((_, i) => {
      const t = now - (9 - i) * 60_000; // 1분 단위 시점
      const base = 1.0; // 기준 가격 (1 KRW)
      const amplitude = 0.01; // 변동 폭 (±1%)
      const noise = (Math.random() - 0.5) * 0.002; // ±0.1% 랜덤 노이즈
      const price = base + amplitude * Math.sin(t / 100000) + noise;
      return { time: new Date(t).toISOString(), price: Number(price.toFixed(4)) };
    });

    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});


/** ✅ 헬스체크 */
app.get("/status", async (_req, res) => {
  try {
    const net = await provider.getNetwork();
    const bal = await provider.getBalance(await wallet.getAddress());
    res.json({
      ok: true,
      network: net.name,
      chainId: net.chainId.toString(),
      backendAddress: await wallet.getAddress(),
      backendEth: ethers.formatEther(bal),
      tokenAddress: TOKEN_ADDRESS,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/** ✅ 허용 주소 추가 */
app.post("/allow", async (req, res) => {
  try {
    const { address, ok = true } = req.body || {};
    if (!ethers.isAddress(address)) throw new Error("invalid address");
    const tx = await contract.setAllowed(address, Boolean(ok));
    const rcpt = await tx.wait();
    res.json({ ok: true, txHash: rcpt.hash });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e) });
  }
});

/** ✅ 예치 → 발행 */
app.post("/deposit", async (req, res) => {
  try {
    const { to, amount, meta } = req.body;

    const nextNonce = await provider.getTransactionCount(wallet.address, "pending");

    const tx2 = await contract.mint(to, ethers.parseUnits(amount.toString(), 18), meta, {
      nonce: nextNonce,
      gasLimit: 1_000_000,
    });

    await tx2.wait();
    res.json({ ok: true, minted: { to, amount, meta, txHash: tx2.hash } });
  } catch (err) {
    console.error("❌ Mint error:", err);
    res.json({ ok: false, error: String(err) });
  }
});


/** ✅ 상환 요청 */
app.post("/redeem/request", async (req, res) => {
  try {
    const { amount, requestId, meta = "" } = req.body || {};
    if (!requestId) throw new Error("missing requestId");
    if (!amount || Number(amount) <= 0) throw new Error("invalid amount");

    const tx = await contract.requestRedeem(ethers.id(requestId), toUnits(amount), meta);
    const rcpt = await tx.wait();
    res.json({ ok: true, txHash: rcpt.hash });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e) });
  }
});

/** ✅ 상환 완료(소각) */
app.post("/redeem/fulfill", async (req, res) => {
  try {
    const { requestId, user, amount, meta = "" } = req.body || {};
    if (!requestId) throw new Error("missing requestId");
    if (!ethers.isAddress(user)) throw new Error("invalid user");
    if (!amount || Number(amount) <= 0) throw new Error("invalid amount");

    const tx = await contract.fulfillRedeem(ethers.id(requestId), user, toUnits(amount), meta);
    const rcpt = await tx.wait();
    res.json({ ok: true, txHash: rcpt.hash });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e) });
  }
});

/** ✅ 잔액 조회 */
app.get("/balance", async (req, res) => {
  try {
    let { address } = req.query;

    // ✅ 주소 유효성 검증 (안 들어온 경우)
    if (!address || typeof address !== "string") {
      throw new Error("missing address");
    }

    // ✅ 공백 제거 + 소문자 변환
    address = address.trim().toLowerCase();

    // ✅ 엄격 검사를 완화 (테스트 모드)
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      console.warn("⚠️ 주소 형식 문제 감지, 강제 통과:", address);
    }

    const bal = await contract.balanceOf(address);
    const formatted = ethers.formatUnits(bal, Number(DECIMALS));

    res.json({ ok: true, address, balance: formatted });
  } catch (e) {
    console.error("❌ balance error:", e.message);
    res.status(400).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://127.0.0.1:${PORT}`);
});

