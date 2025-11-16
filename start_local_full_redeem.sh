#!/bin/bash
# ======================================================
# 🪙 SimFIAT 로컬 전체 시뮬레이션 (Mint + Redeem)
# Hardhat node + Backend server + 자동 테스트 시나리오
# ======================================================

echo "🚀 Starting FULL local simulation (Hardhat + Backend + Mint + Redeem)..."

# ✅ 1. Hardhat node 실행
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

# ✅ 3. 테스트 변수 설정
USER="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
DEPOSIT_AMOUNT=1000
REDEEM_AMOUNT=600
REQ_ID="req-auto-$(date +%s)"

echo "🪙 Running deposit → mint simulation..."
curl -s -X POST http://127.0.0.1:4000/deposit \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"$USER\",\"amount\":$DEPOSIT_AMOUNT,\"meta\":\"$REQ_ID\"}" > logs_deposit.txt

sleep 2

echo "💰 Checking minted balance..."
curl -s "http://127.0.0.1:4000/balance?address=$USER" > logs_balance_minted.txt
MINTED_BALANCE=$(cat logs_balance_minted.txt | jq -r '.balance')

echo "✅ Mint done → User balance: $MINTED_BALANCE"

# ✅ 4. 상환(redeem) 테스트 실행
REQ_ID2="redeem-auto-$(date +%s)"
echo "🏦 Running redeem request (burn $REDEEM_AMOUNT)..."
curl -s -X POST http://127.0.0.1:4000/redeem \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"$USER\",\"amount\":$REDEEM_AMOUNT,\"meta\":\"$REQ_ID2\"}" > logs_redeem.txt

sleep 2

echo "💰 Checking balance after redeem..."
curl -s "http://127.0.0.1:4000/balance?address=$USER" > logs_balance_final.txt
FINAL_BALANCE=$(cat logs_balance_final.txt | jq -r '.balance')

echo "----------------------------------------------"
echo "✅ sFIAT Simulation Complete!"
echo "User Address: $USER"
echo "Minted: $DEPOSIT_AMOUNT"
echo "Redeemed: $REDEEM_AMOUNT"
echo "Final Balance: $FINAL_BALANCE"
echo "----------------------------------------------"
echo "Logs:"
echo "  tail -f logs_hardhat.txt"
echo "  tail -f logs_backend.txt"
echo "  tail -f logs_deposit.txt"
echo "  tail -f logs_redeem.txt"
echo "----------------------------------------------"
