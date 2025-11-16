#!/bin/bash
# ======================================================
# 🪙 SimFIAT 로컬 환경 올인원 실행 스크립트
# Hardhat node + Backend server + 테스트 트랜잭션 자동 수행
# ======================================================

echo "🚀 Starting full local simulation (Hardhat + Backend + Mint Test)..."

# ✅ 1. Hardhat node 실행 확인
PORT_IN_USE=$(lsof -i :8545 | grep LISTEN)

if [ -n "$PORT_IN_USE" ]; then
  echo "⚠️  Hardhat node already running (port 8545). Using existing one."
else
  echo "🟢 Launching new Hardhat node..."
  npx hardhat node > logs_hardhat.txt 2>&1 &
  sleep 3
fi

# ✅ 2. Backend 서버 실행
if [ -d "backend" ]; then
  echo "🟢 Starting backend server..."
  cd backend
  node server.js > ../logs_backend.txt 2>&1 &
  cd ..
  sleep 3
else
  echo "❌ backend 폴더가 없습니다. 먼저 backend/server.js 생성 후 다시 실행하세요."
  exit 1
fi

# ✅ 3. 테스트 계정 및 파라미터 설정
TO="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
AMOUNT=1000
REQ_ID="req-auto-$(date +%s)"

# ✅ 4. 자동 민팅 테스트 실행
echo "🪙 Running dummy deposit → mint simulation..."
curl -s -X POST http://127.0.0.1:4000/deposit \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"$TO\",\"amount\":$AMOUNT,\"meta\":\"$REQ_ID\"}" > logs_deposit.txt

echo "✅ Deposit request sent (reqId: $REQ_ID)"

# ✅ 5. 잔액 확인
echo "💰 Checking balance for $TO ..."
sleep 2
curl -s "http://127.0.0.1:4000/balance?address=$TO" > logs_balance.txt

BALANCE=$(cat logs_balance.txt | jq -r '.balance')

echo "----------------------------------------------"
echo "✅ Mint Test Complete!"
echo "User Address: $TO"
echo "Minted Amount: $AMOUNT"
echo "Reported Balance: $BALANCE"
echo "----------------------------------------------"
echo "Logs:"
echo "  tail -f logs_hardhat.txt"
echo "  tail -f logs_backend.txt"
echo "----------------------------------------------"
