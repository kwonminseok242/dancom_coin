import { ethers } from "hardhat";
const TOKEN = process.env.TOKEN_ADDRESS!;
const USER = process.env.USER!; // 상환 요청자 주소
const REQ = process.env.REQ_ID || "req-001";
const AMOUNT = process.env.AMOUNT || "500000";


async function main() {
const token = await ethers.getContractAt("SimFiatStable", TOKEN);


// 1) 사용자(시뮬레이트): 상환 요청 이벤트 발생
const userSigner = await ethers.getSigner(USER);
const tokenAsUser = token.connect(userSigner);
const reqTx = await tokenAsUser.requestRedeem(ethers.id(REQ), ethers.parseUnits(AMOUNT, 18), "{reason:\"cashout\"}");
await reqTx.wait();
console.log("redeem requested by", USER);


// 2) 백오피스(운영사): 오프체인 송금 완료 후 fulfill (여기선 즉시)
const fulfillTx = await token.fulfillRedeem(ethers.id(REQ), USER, ethers.parseUnits(AMOUNT, 18), "{bank:\"sent\"}");
await fulfillTx.wait();
console.log("redeem fulfilled for", USER);
}


main().catch((e) => { console.error(e); process.exit(1); });