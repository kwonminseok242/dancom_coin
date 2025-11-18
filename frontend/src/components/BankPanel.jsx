// src/components/BankPanel.jsx
import React, { useEffect, useState } from "react";
import {
  getBanks,
  depositBank,
  withdrawBank,
  setBankBalance,
} from "../api/backend";

export default function BankPanel({ addLog }) {
  const [banks, setBanks] = useState([]);
  const [totalReserves, setTotalReserves] = useState(0);
  const [hhi, setHhi] = useState(0);
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await getBanks();
      if (!res.ok) throw new Error(res.error || "banks error");
      setBanks(res.banks || []);
      setTotalReserves(res.totalReserves || 0);
      setHhi(res.hhi || 0);
    } catch (e) {
      console.error(e);
      addLog?.(`은행 데이터 로드 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleInputChange = (id, value) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const parseAmount = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const act = async (action, id) => {
    const raw = inputs[id];
    const amt = parseAmount(raw);
    if (!amt) {
      addLog?.("금액을 올바르게 입력해 주세요.");
      return;
    }

    try {
      setLoading(true);
      let res;
      if (action === "deposit") {
        res = await depositBank(id, amt);
      } else if (action === "withdraw") {
        res = await withdrawBank(id, amt);
      } else if (action === "set") {
        res = await setBankBalance(id, amt);
      }
      if (!res.ok) throw new Error(res.error || "bank action error");
      addLog?.(
        `은행 [${res.bank?.name || id}] ${action} ${amt.toLocaleString(
          "ko-KR"
        )}₩`
      );
      setInputs((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch (e) {
      console.error(e);
      addLog?.(`은행 조정 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>은행별 준비금 관리</h2>
      <p className="sub">
        실제 운영사가 보유한 원화 준비금을 은행별로 분산하여 관리하는 화면입니다.
        아래에서 은행별 입금/출금 또는 잔액 직접 설정이 가능합니다.
      </p>
      <div className="bank-summary">
        <span>
          총 준비금:{" "}
          <b>{Math.round(totalReserves).toLocaleString("ko-KR")} ₩</b>
        </span>
        <span>
          분산도(HHI): <b>{hhi.toFixed(3)}</b>{" "}
          <span className="hint">(0.33 근처면 3개 은행 균등 분산)</span>
        </span>
      </div>
      <table className="bank-table">
        <thead>
          <tr>
            <th>은행</th>
            <th>잔액(₩)</th>
            <th>비중</th>
            <th>입·출금 / 설정</th>
          </tr>
        </thead>
        <tbody>
          {banks.map((b) => (
            <tr key={b.id}>
              <td>{b.name}</td>
              <td>{Math.round(b.balance).toLocaleString("ko-KR")}</td>
              <td>{(b.weight * 100).toFixed(1)}%</td>
              <td>
                <input
                  type="number"
                  className="amount-input"
                  placeholder="금액"
                  value={inputs[b.id] ?? ""}
                  onChange={(e) => handleInputChange(b.id, e.target.value)}
                />
                <button
                  className="btn btn-small"
                  disabled={loading}
                  onClick={() => act("deposit", b.id)}
                >
                  입금
                </button>
                <button
                  className="btn btn-small"
                  disabled={loading}
                  onClick={() => act("withdraw", b.id)}
                >
                  출금
                </button>
                <button
                  className="btn btn-small btn-muted"
                  disabled={loading}
                  onClick={() => act("set", b.id)}
                >
                  잔액 설정
                </button>
              </td>
            </tr>
          ))}
          {banks.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>
                은행 데이터가 없습니다. (백엔드 /banks API 확인 필요)
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
