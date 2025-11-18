// src/components/CoverageChart.jsx
import React, { useEffect, useRef, useState } from "react";
import { getMetrics } from "../api/backend";
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

export default function CoverageChart({ addLog }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [series, setSeries] = useState([]);

  async function poll() {
    try {
      const res = await getMetrics();
      if (!res.ok) throw new Error(res.error || "metrics error");

      setSeries((prev) => {
        const next = [
          ...prev,
          {
            t: new Date(),
            coverageRatio: res.coverageRatio,
          },
        ];
        if (next.length > 100) next.shift();
        return next;
      });
    } catch (e) {
      console.error(e);
      addLog?.(`담보율 갱신 실패: ${e.message}`);
    }
  }

  useEffect(() => {
    poll();
  }, []);

  useInterval(poll, 5000);

  useEffect(() => {
    const ctx = canvasRef.current;
    if (!ctx) return;

    const labels = series.map((p) =>
      p.t.toLocaleTimeString("ko-KR", { hour12: false })
    );
    const coverages = series.map((p) => p.coverageRatio);

    const data = {
      labels,
      datasets: [
        {
          label: "Coverage Ratio",
          data: coverages,
          borderColor: "#eab308",
          backgroundColor: "rgba(234,179,8,0.12)",
          tension: 0.25,
          fill: true,
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
          },
          scales: {
            x: {
              ticks: { color: "#9ca3af", maxRotation: 0 },
              grid: { color: "rgba(55,65,81,0.4)" },
            },
            y: {
              ticks: { color: "#9ca3af" },
              grid: { color: "rgba(55,65,81,0.4)" },
              title: {
                display: true,
                text: "Coverage Ratio",
                color: "#9ca3af",
              },
              beginAtZero: true,
            },
          },
        },
      });
    } else {
      chartRef.current.data = data;
      chartRef.current.update();
    }
  }, [series]);

  return (
    <div className="card">
      <h2>담보율(Coverage) 차트</h2>
      <canvas ref={canvasRef} height="180" />
    </div>
  );
}
