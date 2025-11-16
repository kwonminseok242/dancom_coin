#!/bin/bash
# ================================
# sFIAT Stablecoin 로컬 실행 스크립트
# Hardhat Node + Backend Server 동시 실행
# ================================

echo "🚀 SimFiat Local Environment Starting..."

# Hardhat node 이미 실행 중인지 확인
PORT_IN_USE=$(lsof -i :8545 | grep LISTEN)

if [ -n "$PORT_IN_USE" ]; then
  echo "⚠️  Hardhat node (port 8545) already running. Using existing one."
else
  echo "🟢 Starting new Hardhat node..."
  npx hardhat node > logs_hardhat.txt 2>&1 &
  sleep 3
fi

# Backend 서버 실행
echo "🟢 Starting backend server..."
cd backend
node server.js > ../logs_backend.txt 2>&1 &
cd ..

echo "✅ All systems running!"
echo "----------------------------------------"
echo "Hardhat RPC   → http://127.0.0.1:8545"
echo "Backend API   → http://127.0.0.1:4000"
echo "View logs:"
echo "  tail -f logs_hardhat.txt"
echo "  tail -f logs_backend.txt"
echo "----------------------------------------"
