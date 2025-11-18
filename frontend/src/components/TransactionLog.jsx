// src/components/TransactionLog.jsx
import React from "react";

export default function TransactionLog({ logs }) {
  return (
    <div className="card log-card">
      <h2>이벤트 로그</h2>
      <div className="log-area">
        {logs.length === 0 && (
          <div className="log-empty">아직 이벤트가 없습니다.</div>
        )}
        {logs.map((line, idx) => (
          <div key={idx} className="log-line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
