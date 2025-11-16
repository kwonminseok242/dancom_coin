const backend = "http://127.0.0.1:4000";
let chart;

// 📦 가격 데이터 로드
async function loadPrice() {
  try {
    const res = await fetch(`${backend}/price-feed`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "데이터 없음");

    return json.data.map((d) => ({
      x: new Date(d.time).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      y: d.price,
    }));
  } catch (err) {
    console.error("❌ 가격 데이터 불러오기 실패:", err);
    return [];
  }
}

// ⚙️ 노드 상태 로드
async function loadStatus() {
  try {
    const res = await fetch(`${backend}/status`);
    const json = await res.json();

    if (json.ok) {
      document.getElementById("rpc-url").textContent = json.network || "unknown";
      document.getElementById("chain-id").textContent = json.chainId;
      document.getElementById("backend-address").textContent = json.backendAddress;
      document.getElementById("network-status").textContent = "🟢 연결됨";
    } else {
      document.getElementById("network-status").textContent = "🔴 연결 실패";
    }
  } catch (err) {
    console.error("❌ 상태 불러오기 실패:", err);
    document.getElementById("network-status").textContent = "🔴 연결 실패";
  }
}

// 💰 잔액 불러오기
async function loadBalance() {
  try {
    const addr = document.getElementById("user-address").textContent.trim().toLowerCase();
    const res = await fetch(`${backend}/balance?address=${encodeURIComponent(addr)}`);
    const json = await res.json();

    if (json.ok) {
      document.getElementById("user-balance").textContent = `${Number(json.balance).toFixed(2)} sKRW`;
    } else {
      document.getElementById("user-balance").textContent = "조회 실패";
    }
  } catch (err) {
    console.error("❌ 잔액 조회 실패:", err);
  }
}

// 📈 차트 렌더링
async function renderChart() {
  const data = await loadPrice();
  const ctx = document.getElementById("priceChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((d) => d.x),
      datasets: [
        {
          label: "sFIAT / KRW",
          data: data.map((d) => d.y),
          borderColor: "#ff6600",
          backgroundColor: "rgba(255,102,0,0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 300, easing: "easeOutCubic" },
      plugins: {
        legend: {
          labels: { color: "#ff6600" },
        },
        tooltip: {
          backgroundColor: "#111",
          titleColor: "#ff6600",
          bodyColor: "#fff",
        },
      },
      scales: {
        x: {
          ticks: { color: "#aaa" },
          grid: { color: "#222" },
        },
        y: {
          ticks: { color: "#ccc" },
          grid: { color: "#222" },
        },
      },
    },
  });
}

// 🔄 3초마다 자동 갱신
setInterval(async () => {
  const newData = await loadPrice();
  if (chart && newData.length > 0) {
    chart.data.labels = newData.map((d) => d.x);
    chart.data.datasets[0].data = newData.map((d) => d.y);
    chart.update();
  }
}, 3000);

// 🚀 초기화
loadStatus();
loadBalance();
renderChart();

document.getElementById("refresh-balance").addEventListener("click", loadBalance);
