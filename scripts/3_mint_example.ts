import { ethers } from "hardhat";
const TOKEN = process.env.TOKEN_ADDRESS!;
const TO = process.env.MINT_TO!;
const AMOUNT = process.env.AMOUNT || "1000000"; // 6 decimals 가정 아님 — 여긴 18dec 기본


async function main() {
const token = await ethers.getContractAt("SimFiatStable", TOKEN);
const tx = await token.mint(TO, ethers.parseUnits(AMOUNT, 18), "{bank:\"ok\"}");
await tx.wait();
console.log("minted to", TO, AMOUNT);
}


main().catch((e) => { console.error(e); process.exit(1); });