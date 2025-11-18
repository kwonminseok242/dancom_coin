// server.js

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config as dotenv } from "dotenv";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

dotenv();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(".")); // 정적 파일 (테스트용)

// ─────────────────────────────────────────────
// 환경 변수
// ─────────────────────────────────────────────
const {
  RPC_URL,
  PRIVATE_KEY,
  TOKEN_ADDRESS,
  DECIMALS = "18",
  PORT = "4000",
} = process.env;

// DECIMALS를 숫자로 변환 (ethers v6에서 문자열이면 에러)
const DECIMALS_NUM = Number(DECIMALS || 18);
if (!Number.isInteger(DECIMALS_NUM)) {
  console.error("❌ DECIMALS 환경변수가 잘못되었습니다. 숫자여야 합니다. (예: 18)");
  process.exit(1);
}

if (!RPC_URL || !PRIVATE_KEY || !TOKEN_ADDRESS) {
  console.error(
    "❌ .env 설정이 부족합니다 (RPC_URL / PRIVATE_KEY / TOKEN_ADDRESS)"
  );
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
  "function totalSupply() view returns (uint256)",
  "event Minted(address indexed to, uint256 amount, string meta)",
  "event RedeemRequested(address indexed user, bytes32 requestId, uint256 amount, string meta)",
  "event RedeemFulfilled(bytes32 requestId, address indexed user, uint256 amount, string meta)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const contract = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);
const toUnits = (amt) => ethers.parseUnits(String(amt), DECIMALS_NUM);

// ─────────────────────────────────────────────
// 🏦 은행 준비금 시스템 (오프체인 + JSON 저장)
// ─────────────────────────────────────────────

const BANKS_FILE = path.resolve("banks.json");

// 기본 3개 은행 (원하면 더 추가해도 됨)
let banks = {
  shinhan: { id: "shinhan", name: "신한은행", balance: 0 },
  kb: { id: "kb", name: "국민은행", balance: 0 },
  hana: { id: "hana", name: "하나은행", balance: 0 },
};

// banks.json 있으면 불러오기
if (fs.existsSync(BANKS_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(BANKS_FILE, "utf-8"));
    // 최소한의 구조 보정
    if (data && typeof data === "object") {
      banks = {
        ...banks,
        ...data,
      };
    }
    console.log("📂 banks.json 로드 완료");
  } catch (e) {
    console.error("❌ banks.json 파싱 실패, 기본값 사용:", e);
  }
}

// 변경 시 저장
function saveBanks() {
  fs.writeFileSync(BANKS_FILE, JSON.stringify(banks, null, 2));
  console.log("💾 banks.json 저장됨");
}

// 총 준비금
function getTotalReserves() {
  return Object.values(banks).reduce((sum, b) => sum + b.balance, 0);
}

// HHI (분산도) + weight 계산
function getBanksSummary() {
  const total = getTotalReserves();
  const arr = Object.values(banks).map((b) => {
    const weight = total > 0 ? b.balance / total : 0;
    return { ...b, weight };
  });
  const hhi = arr.reduce((s, b) => s + (b.weight || 0) ** 2, 0);
  return { banks: arr, totalReserves: total, hhi };
}

function getBankOrThrow(id) {
  const bank = banks[id];
  if (!bank) {
    const err = new Error(`unknown bank id: ${id}`);
    err.status = 404;
    throw err;
  }
  return bank;
}

// ─────────────────────────────────────────────
// 💹 Price Feed : 담보율 + 시장소음 + 뉴스충격 + EMA
// ─────────────────────────────────────────────

let lastPrice = 1.0; // EMA 초기값

app.get("/price-feed", async (_req, res) => {
  try {
    const totalSupply = await contract.totalSupply();
    const supplyKRW = Number(ethers.formatUnits(totalSupply, DECIMALS_NUM));
    const totalReserves = getTotalReserves();

    // 담보율 기반 이론 가격
    const theoreticalPrice =
      supplyKRW === 0 ? 1.0 : totalReserves / supplyKRW;

    // 주문서 충격 (수급) ±2%
    const orderFlow = (Math.random() - 0.5) * 0.04;
    const marketPressure = 1 + orderFlow;

    // 외부 뉴스 충격 ±0.5%
    const newsShock = (Math.random() - 0.5) * 0.01;

    // 이론가격 * 수급 * 뉴스
    let price = theoreticalPrice * marketPressure * (1 + newsShock);

    // EMA로 부드럽게
    price = lastPrice * 0.7 + price * 0.3;
    lastPrice = price;

    const now = Date.now();
    res.json({
      ok: true,
      data: {
        timestamp: new Date(now).toISOString(),
        price: Number(price.toFixed(4)),
        theoreticalPrice,
        reservesKRW: totalReserves,
        supplyKRW,
      },
    });
  } catch (err) {
    console.error("❌ price-feed error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─────────────────────────────────────────────
// 시스템 상태
// ─────────────────────────────────────────────
app.get("/status", async (_req, res) => {
  try {
    const net = await provider.getNetwork();
    const bal = await provider.getBalance(wallet.address);

    res.json({
      ok: true,
      network: net.name,
      chainId: net.chainId.toString(),
      backendAddress: wallet.address,
      backendEth: ethers.formatEther(bal),
      tokenAddress: TOKEN_ADDRESS,
      totalReserves: getTotalReserves(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 주소 허용
// ─────────────────────────────────────────────
app.post("/allow", async (req, res) => {
  try {
    const { address, ok = true } = req.body || {};
    if (!ethers.isAddress(address)) throw new Error("invalid address");

    const tx = await contract.setAllowed(address, Boolean(ok));
    await tx.wait();

    res.json({ ok: true, txHash: tx.hash });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 💰 예치(원화) → 발행 (온체인 mint)
//   ※ 은행 준비금은 여기서 자동 조정하지 않고,
//      은행 패널에서 따로 설정/입출금 하도록 설계
// ─────────────────────────────────────────────
app.post("/deposit", async (req, res) => {
  try {
    const { to, amountKRW, meta = "" } = req.body || {};

    if (!to || !ethers.isAddress(to)) throw new Error("invalid to address");
    if (!amountKRW || Number(amountKRW) <= 0) {
      throw new Error("invalid KRW amount");
    }

    const amt = Number(amountKRW);

    const tx = await contract.mint(to, toUnits(amt), meta);
    await tx.wait();

    res.json({
      ok: true,
      minted: { to, amountKRW: amt, txHash: tx.hash },
    });
  } catch (e) {
    console.error("❌ deposit error:", e);
    res.status(400).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 상환 요청(request)
// ─────────────────────────────────────────────
app.post("/redeem/request", async (req, res) => {
  try {
    const { amountKRW, requestId, meta = "" } = req.body || {};

    if (!requestId) throw new Error("missing requestId");
    if (!amountKRW || Number(amountKRW) <= 0) {
      throw new Error("invalid amount");
    }

    const amt = Number(amountKRW);

    const tx = await contract.requestRedeem(
      ethers.id(requestId),
      toUnits(amt),
      meta
    );
    await tx.wait();

    res.json({ ok: true, requestId, txHash: tx.hash });
  } catch (e) {
    console.error("❌ redeem request error:", e);
    res.status(400).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 💸 상환 완료(소각)
// ─────────────────────────────────────────────
app.post("/redeem/fulfill", async (req, res) => {
  try {
    const { requestId, user, amountKRW, meta = "" } = req.body || {};

    if (!requestId) throw new Error("missing requestId");
    if (!ethers.isAddress(user)) throw new Error("invalid user");
    if (!amountKRW || Number(amountKRW) <= 0) {
      throw new Error("invalid amount");
    }

    const amt = Number(amountKRW);

    const tx = await contract.fulfillRedeem(
      ethers.id(requestId),
      user,
      toUnits(amt),
      meta
    );
    await tx.wait();

    res.json({
      ok: true,
      txHash: tx.hash,
    });
  } catch (e) {
    console.error("❌ redeem fulfill error:", e);
    res.status(400).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 잔액 조회
// ─────────────────────────────────────────────
app.get("/balance", async (req, res) => {
  try {
    let { address } = req.query;
    if (!address || typeof address !== "string") {
      throw new Error("missing address");
    }
    address = address.trim().toLowerCase();

    const bal = await contract.balanceOf(address);
    const formatted = ethers.formatUnits(bal, DECIMALS_NUM);

    res.json({ ok: true, address, balance: formatted });
  } catch (e) {
    console.error("❌ balance error:", e.message);
    res.status(400).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 📊 담보율 / 준비금 / 발행량 메트릭
// ─────────────────────────────────────────────
app.get("/metrics", async (_req, res) => {
  try {
    const totalSupply = await contract.totalSupply();
    const supplyKRW = Number(ethers.formatUnits(totalSupply, DECIMALS_NUM));
    const totalReserves = getTotalReserves();

    const coverage =
      supplyKRW === 0 ? 1.0 : totalReserves / supplyKRW;

    res.json({
      ok: true,
      reservesKRW: totalReserves,
      supplyKRW,
      coverageRatio: Number(coverage.toFixed(4)),
    });
  } catch (e) {
    console.error("❌ metrics error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 🏦 은행 API
//   GET /banks
//   POST /banks/:id/deposit
//   POST /banks/:id/withdraw
//   POST /banks/:id/set
//   POST /banks/:id/shock-loss
// ─────────────────────────────────────────────

app.get("/banks", (_req, res) => {
  try {
    const summary = getBanksSummary();
    res.json({ ok: true, ...summary });
  } catch (e) {
    console.error("❌ banks error:", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/banks/:id/deposit", (req, res) => {
  try {
    const bank = getBankOrThrow(req.params.id);
    const { amount } = req.body || {};
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error("invalid amount");
    bank.balance += amt;

    saveBanks();

    const summary = getBanksSummary();
    const enrichedBank = summary.banks.find((b) => b.id === bank.id);

    res.json({
      ok: true,
      bank: enrichedBank,
      totalReserves: summary.totalReserves,
      hhi: summary.hhi,
    });
  } catch (e) {
    console.error("❌ bank deposit error:", e);
    res.status(e.status || 400).json({ ok: false, error: String(e) });
  }
});

app.post("/banks/:id/withdraw", (req, res) => {
  try {
    const bank = getBankOrThrow(req.params.id);
    const { amount } = req.body || {};
    const amt = Number(amount);
    if (!amt || amt <= 0) throw new Error("invalid amount");
    if (bank.balance < amt) throw new Error("insufficient bank balance");
    bank.balance -= amt;

    saveBanks();

    const summary = getBanksSummary();
    const enrichedBank = summary.banks.find((b) => b.id === bank.id);

    res.json({
      ok: true,
      bank: enrichedBank,
      totalReserves: summary.totalReserves,
      hhi: summary.hhi,
    });
  } catch (e) {
    console.error("❌ bank withdraw error:", e);
    res.status(e.status || 400).json({ ok: false, error: String(e) });
  }
});

app.post("/banks/:id/set", (req, res) => {
  try {
    const bank = getBankOrThrow(req.params.id);
    const { amount } = req.body || {};
    const amt = Number(amount);
    if (amt == null || amt < 0) throw new Error("invalid amount");
    bank.balance = amt;

    saveBanks();

    const summary = getBanksSummary();
    const enrichedBank = summary.banks.find((b) => b.id === bank.id);

    res.json({
      ok: true,
      bank: enrichedBank,
      totalReserves: summary.totalReserves,
      hhi: summary.hhi,
    });
  } catch (e) {
    console.error("❌ bank set error:", e);
    res.status(e.status || 400).json({ ok: false, error: String(e) });
  }
});

// 특정 은행 부실(shock-loss)
app.post("/banks/:id/shock-loss", async (req, res) => {
  try {
    const bank = getBankOrThrow(req.params.id);
    const { ratio = 0.4 } = req.body || {};
    const r = Number(ratio);
    if (!(r > 0 && r < 1)) throw new Error("ratio must be between 0 and 1");

    const lossAmount = bank.balance * r;
    bank.balance = Math.max(0, bank.balance - lossAmount);

    saveBanks();

    const summary = getBanksSummary();
    const enrichedBank = summary.banks.find((b) => b.id === bank.id);

    const totalSupply = await contract.totalSupply();
    const supplyKRW = Number(
      ethers.formatUnits(totalSupply, DECIMALS_NUM)
    );
    const coverage =
      supplyKRW === 0 ? 1.0 : summary.totalReserves / supplyKRW;

    res.json({
      ok: true,
      bank: enrichedBank,
      lossAmount,
      totalReserves: summary.totalReserves,
      coverageRatio: Number(coverage.toFixed(4)),
      hhi: summary.hhi,
    });
  } catch (e) {
    console.error("❌ bank shock-loss error:", e);
    res.status(e.status || 400).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 💥 전체 회복 시나리오: /shock/recover
// ─────────────────────────────────────────────
app.post("/shock/recover", async (req, res) => {
  try {
    const { targetCoverage = 1.1 } = req.body || {};
    const target = Number(targetCoverage);
    if (!(target > 0)) throw new Error("invalid targetCoverage");

    const totalSupply = await contract.totalSupply();
    const supplyKRW = Number(
      ethers.formatUnits(totalSupply, DECIMALS_NUM)
    );

    if (supplyKRW === 0) {
      // 발행량 없으면 준비금도 0으로 초기화
      Object.values(banks).forEach((b) => (b.balance = 0));
      saveBanks();
      return res.json({
        ok: true,
        coverageRatio: 1.0,
        totalReserves: 0,
        banks: getBanksSummary().banks,
      });
    }

    const targetReserves = supplyKRW * target;
    const currentTotal = getTotalReserves();
    const bankList = Object.values(banks);

    if (currentTotal === 0) {
      // 현재 준비금이 0이면 은행들에 균등 분배
      const perBank = targetReserves / bankList.length;
      bankList.forEach((b) => (b.balance = perBank));
    } else {
      // 현재 비중 유지하면서 전체를 targetReserves로 스케일링
      const scale = targetReserves / currentTotal;
      bankList.forEach((b) => (b.balance = b.balance * scale));
    }

    saveBanks();

    const summary = getBanksSummary();
    const coverage =
      supplyKRW === 0 ? 1.0 : summary.totalReserves / supplyKRW;

    res.json({
      ok: true,
      coverageRatio: Number(coverage.toFixed(4)),
      totalReserves: summary.totalReserves,
      banks: summary.banks,
      hhi: summary.hhi,
    });
  } catch (e) {
    console.error("❌ shock recover error:", e);
    res.status(e.status || 400).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────
// 서버 시작
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(
    `🔥 Stablecoin backend running at http://127.0.0.1:${PORT}`
  );
});
