// src/components/PriceChart.jsx
import React, { useEffect, useRef, useState } from "react";
import { getPriceFeed } from "../api/backend";
import useInterval from "../hooks/useInterval";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

export default function PriceChart({ addLog }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [series, setSeries] = useState([]);

  async function poll() {
    try {
      const res = await getPriceFeed();
      if (!res.ok) throw new Error(res.error || "price-feed error");
      const pf = res.data;

      setSeries((prev) => {
        const next = [
          ...prev,
          {
            t: new Date(pf.timestamp),
            price: pf.price,
            theoreticalPrice: pf.theoreticalPrice,
          },
        ];
        // 최근 100개만 유지
        if (next.length > 100) next.shift();
        return next;
      });
    } catch (e) {
      console.error(e);
      addLog?.(`가격 데이터 갱신 실패: ${e.message}`);
    }
  }

  useEffect(() => {
    poll(); // 첫 로딩 시 한 번
  }, []);

  useInterval(poll, 3000);

  useEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx) return;

    const labels = series.map((p) =>
      p.t.toLocaleTimeString("ko-KR", { hour12: false })
    );
    const prices = series.map((p) => p.price);
    const theoretical = series.map((p) => p.theoreticalPrice);

    const data = {
      labels,
      datasets: [
        {
          label: "시장 가격 (sKRW / KRW)",
          data: prices,
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79,70,229,0.15)",
          tension: 0.25,
          fill: true,
        },
        {
          label: "이론 가격 (담보율 기반)",
          data: theoretical,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.05)",
          borderDash: [5, 5],
          tension: 0.25,
          fill: false,
        },
      ],
    };

    if (!chartRef.current) {
      chartRef.current = new Chart(ctx, {
        type: "line",
        data,
        options: {
          responsive: true,
          animation: false,
          plugins: {
            legend: {
              labels: { color: "#e5e7eb", font: { size: 11 } },
            },
            tooltip: {
              mode: "index",
              intersect: false,
            },
          },
          scales: {
            x: {
              ticks: { color: "#9ca3af", maxRotation: 0 },
              grid: { color: "rgba(55,65,81,0.4)" },
            },
            y: {
              ticks: { color: "#9ca3af" },
              grid: { color: "rgba(55,65,81,0.4)" },
              title: { display: true, text: "Price (KRW)", color: "#9ca3af" },
            },
          },
        },
      });
    } else {
      chartRef.current.data = data;
      chartRef.current.update();
    }

    return () => {};
  }, [series]);

  return (
    <div className="card">
      <h2>가격 차트 (시장 vs 이론)</h2>
      <canvas ref={canvasRef} height="180" />
    </div>
  );
}
