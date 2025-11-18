// src/components/ScenarioPanel.jsx
import React, { useState } from "react";
import { getBanks, shockLoss, shockRecover } from "../api/backend";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function ScenarioPanel({ addLog }) {
  const [running, setRunning] = useState(false);

  async function triggerLossOnce() {
    try {
      const res = await getBanks();
      if (!res.ok) throw new Error(res.error || "banks error");
      const banks = res.banks || [];
      if (banks.length === 0) throw new Error("은행 데이터 없음");

      // 잔액이 가장 큰 은행을 하나 골라서 부실 처리
      const target = banks.reduce((a, b) =>
        a.balance >= b.balance ? a : b
      );
      const lossRes = await shockLoss(target.id, 0.4); // 40% 손실
      if (!lossRes.ok) throw new Error(lossRes.error || "loss error");
      addLog?.(
        `💥 [${target.name}] 준비금 40% 손실 → 총 준비금: ${Math.round(
          lossRes.totalReserves
        ).toLocaleString("ko-KR")}₩`
      );
    } catch (e) {
      console.error(e);
      addLog?.(`Shock loss 실패: ${e.message}`);
    }
  }

  async function triggerRecoverOnce() {
    try {
      const rec = await shockRecover(1.1); // 담보율 110% 목표
      if (!rec.ok) throw new Error(rec.error || "recover error");
      addLog?.(
        `✅ 자본 확충 / 정부지원 → Coverage: ${rec.coverageRatio.toFixed(4)}`
      );
    } catch (e) {
      console.error(e);
      addLog?.(`Shock recover 실패: ${e.message}`);
    }
  }

  async function runScenario() {
    if (running) return;
    setRunning(true);
    try {
      addLog?.("🎬 시나리오 시작: 정상 상태 관찰 중...");
      await sleep(5000);

      addLog?.("💣 (시나리오) 특정 은행 부실 → 준비금 손실");
      await triggerLossOnce();
      await sleep(8000);

      addLog?.("🏦 (시나리오) 신규 증자 / 정부지원으로 담보율 회복");
      await triggerRecoverOnce();
      await sleep(8000);

      addLog?.("🎉 시나리오 종료 (원하면 다시 실행 가능)");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card">
      <h2>페그 붕괴 / 회복 시나리오</h2>
      <p className="sub">
        아래 버튼으로 개별 이벤트를 실행하거나, 한 번에 자동 시연을 볼 수 있습니다.
        은행 준비금을 미리 어느 정도 채워둔 뒤 실행하면 효과가 더 잘 보입니다.
      </p>
      <div className="button-row">
        <button className="btn btn-danger" onClick={triggerLossOnce}>
          💥 준비금 손실 이벤트 (페그 붕괴)
        </button>
        <button className="btn btn-success" onClick={triggerRecoverOnce}>
          🏦 자본 확충 (페그 회복)
        </button>
        <button
          className="btn btn-primary"
          onClick={runScenario}
          disabled={running}
        >
          🎬 자동 시연 (정상 → 붕괴 → 회복)
        </button>
      </div>
    </div>
  );
}
