// src/components/MetricsBox.jsx
import React, { useEffect, useState } from "react";
import { getMetrics, getPriceFeed } from "../api/backend";
import useInterval from "../hooks/useInterval";

export default function MetricsBox({ addLog }) {
  const [metrics, setMetrics] = useState(null);
  const [price, setPrice] = useState(null);

  async function poll() {
    try {
      const [mRes, pRes] = await Promise.all([
        getMetrics(),
        getPriceFeed(),
      ]);

      if (!mRes.ok) throw new Error(mRes.error || "metrics error");
      if (!pRes.ok) throw new Error(pRes.error || "price-feed error");

      setMetrics(mRes);
      setPrice(pRes.data);
    } catch (e) {
      console.error(e);
      addLog?.(`메트릭 갱신 실패: ${e.message}`);
    }
  }

  useEffect(() => {
    poll();
  }, []);

  useInterval(poll, 5000);

  const coverage = metrics?.coverageRatio ?? null;
  const reserves = metrics?.reservesKRW ?? null;
  const supply = metrics?.supplyKRW ?? null;

  return (
    <div className="info-grid">
      <div className="card">
        <h2>현재 가격 (시장)</h2>
        <div className="value">
          {price ? price.price.toFixed(4) : "-"} <span className="unit">KRW</span>
        </div>
        <div className="sub">시장 시뮬레이션 가격</div>
      </div>

      <div className="card">
        <h2>담보율 (Coverage Ratio)</h2>
        <div className="value">
          {coverage != null ? coverage.toFixed(4) : "-"}
        </div>
        <div className="sub">준비금 / 총 발행량 · 1.0 이상이면 100% 이상 담보</div>
      </div>

      <div className="card">
        <h2>준비금 & 발행량</h2>
        <div className="value">
          {reserves != null ? Math.round(reserves).toLocaleString("ko-KR") : "-"}{" "}
          <span className="unit">₩</span>
        </div>
        <div className="sub">
          총 발행량:{" "}
          {supply != null ? Math.round(supply).toLocaleString("ko-KR") : "-"} sKRW
        </div>
      </div>
    </div>
  );
}
