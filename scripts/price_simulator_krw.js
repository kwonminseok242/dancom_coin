import fs from "fs";

// CSV 이벤트 불러오기
const csvPath = "events.csv";
if (!fs.existsSync(csvPath)) {
  console.error("❌ events.csv 파일이 없습니다. 먼저 mint/redeem 이벤트를 발생시키세요.");
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);

let totalSupply = 0;
let price = 1.0; // 초기 1 KRW
const prices = [];

for (const line of csv) {
  const [blockNumber, type, , amount] = line.split(",");
  const amt = Number(amount);

  if (type === "Minted") totalSupply += amt;
  if (type === "Redeemed") totalSupply -= amt;

  // 💡 공급 변화에 따른 가격 시뮬레이션
  const liquidityFactor = 8000; // 높을수록 안정적
  const deviation = (5000 - totalSupply) / liquidityFactor;
  price = 1.0 + deviation;

  // 📈 랜덤 노이즈 추가 (시장 요인)
  const noise = (Math.random() - 0.5) * 0.0015;
  price += noise;

  // 1원 ± 5전 범위로 제한
  price = Math.max(0.95, Math.min(1.05, price));

  prices.push({
    blockNumber: Number(blockNumber),
    price: Number(price.toFixed(4)),
  });
}

fs.writeFileSync("price_data_krw.json", JSON.stringify(prices, null, 2));
console.log("✅ price_data_krw.json 생성 완료 (KRW 기준 가격 시뮬레이션)");
