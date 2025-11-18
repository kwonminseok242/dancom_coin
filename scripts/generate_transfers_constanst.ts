// scripts/generate_transfers_constant.ts
import { ethers } from "hardhat";
import fs from "fs";

function toWei(n: number | string, d = 18) {
  return ethers.parseUnits(String(n), d);
}
function fromWei(bi: bigint, d = 18) {
  return Number(ethers.formatUnits(bi, d));
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const addr =
    process.env.SIMFIAT_ADDRESS ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const NUM_TX = Number(process.env.NUM_TX ?? "50");
  const MIN = Number(process.env.MIN_AMT ?? "1");
  const MAX = Number(process.env.MAX_AMT ?? "20");
  const CSV = process.env.CSV ?? "events.csv";

  const [deployer, ...others] = await ethers.getSigners();
  const actors = [deployer, ...others.slice(0, 5)];
  const token = (await ethers.getContractAt("SimFiatStable", addr)) as any;

  console.log("▶ contract:", addr);
  console.log(
    "▶ actors  :",
    actors.map((a) => a.address)
  );

  // allowlist (송/수신 모두 허용)
  for (const a of actors) {
    try {
      await (await token.connect(deployer).setAllowed(a.address, true)).wait();
    } catch {}
  }

  const ts0 = await token.totalSupply();
  console.log("start totalSupply:", fromWei(ts0));

  async function pickSource() {
    let best = actors[0],
      bestBal = 0n;
    for (const a of actors) {
      const b: bigint = await token.balanceOf(a.address);
      if (b > bestBal) {
        best = a;
        bestBal = b;
      }
    }
    return best;
  }

  if (!fs.existsSync(CSV) || fs.statSync(CSV).size === 0)
    fs.writeFileSync(CSV, "time,type,txHash,from,to,amount\n");

  for (let i = 0; i < NUM_TX; i++) {
    let s = actors[randInt(0, actors.length - 1)];
    let r = actors[randInt(0, actors.length - 1)];
    if (s.address === r.address)
      r = actors[(actors.indexOf(r) + 1) % actors.length];

    // 부족하면 '민트'가 아니라 보유자에서 전송으로 보충
    const needMin = toWei(MIN);
    let sBal: bigint = await token.balanceOf(s.address);
    if (sBal < needMin) {
      const src = await pickSource();
      if (src.address !== s.address) {
        const top = needMin - sBal;
        const srcBal: bigint = await token.balanceOf(src.address);
        if (srcBal >= top && top > 0n) {
          try {
            const t = await token.connect(src).transfer(s.address, top);
            await t.wait();
            console.log(
              `[topup] ${src.address} -> ${s.address} +${fromWei(top)}`
            );
            sBal = await token.balanceOf(s.address);
          } catch {}
        }
      }
    }

    sBal = await token.balanceOf(s.address);
    const maxAmt = Math.max(MIN, Math.min(MAX, Math.floor(fromWei(sBal))));
    if (maxAmt < MIN) {
      console.log(`[skip] no liquidity for ${s.address}`);
      continue;
    }
    const amt = randInt(MIN, maxAmt);

    try {
      const tx = await token.connect(s).transfer(r.address, toWei(amt));
      await tx.wait();
      fs.appendFileSync(
        CSV,
        `${new Date().toISOString()},transfer,${tx.hash},${s.address},${
          r.address
        },${amt}\n`
      );
      console.log(`[${i + 1}/${NUM_TX}] ${amt} ${s.address} -> ${r.address}`);
    } catch (e) {
      console.log(`[skip tx ${i + 1}]`, String(e));
    }
  }

  const ts1 = await token.totalSupply();
  console.log("end   totalSupply:", fromWei(ts1));
  console.log(
    ts0 === ts1 ? "✅ totalSupply unchanged" : "⚠️ totalSupply changed!"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
