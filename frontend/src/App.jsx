import React, { useState } from "react";
import PriceChart from "./components/PriceChart.jsx";
import CoverageChart from "./components/CoverageChart.jsx";
import MetricsBox from "./components/MetricsBox.jsx";
import BankPanel from "./components/BankPanel.jsx";
import ScenarioPanel from "./components/ScenarioPanel.jsx";
import TransactionLog from "./components/TransactionLog.jsx";

export default function App() {
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev]);
  };

  return (
    <div className="page">
      <h1>🟧 KRW365 Stablecoin Dashboard</h1>

      <MetricsBox addLog={addLog} />

      <div className="charts">
        <PriceChart addLog={addLog} />
        <CoverageChart addLog={addLog} />
      </div>

      <BankPanel addLog={addLog} />

      <ScenarioPanel addLog={addLog} />

      <TransactionLog logs={logs} />
    </div>
  );
}
