import { ethers } from "hardhat";


const TOKEN = process.env.TOKEN_ADDRESS!;
const ALLOW = (process.env.ALLOW_ADDRESSES || "").split(",").filter(Boolean);
const MINTERS = (process.env.MINTERS || "").split(",").filter(Boolean);
const REDEEMERS = (process.env.REDEEMERS || "").split(",").filter(Boolean);


async function main() {
const token = await ethers.getContractAt("SimFiatStable", TOKEN);


for (const a of ALLOW) {
const tx = await token.setAllowed(a, true);
await tx.wait();
console.log("allowed:", a);
}
for (const m of MINTERS) {
const tx = await token.grantMinter(m);
await tx.wait();
console.log("minter granted:", m);
}
for (const r of REDEEMERS) {
const tx = await token.grantRedeemer(r);
await tx.wait();
console.log("redeemer granted:", r);
}
}


main().catch((e) => { console.error(e); process.exit(1); });