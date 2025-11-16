const ctx = document.getElementById("priceChart");
let chart;

async function fetchPriceData() {
  const res = await fetch("http://127.0.0.1:4000/price-feed");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

async function drawChart() {
  const data = await fetchPriceData();
  const labels = data.map((d) => d.timestamp);
  const prices = data.map((d) => d.price);

  const chartData = {
    labels,
    datasets: [
      {
        label: "₩ 1 sFIAT / KRW",
        data: prices,
        borderColor: "#007bff",
        backgroundColor: "rgba(0,123,255,0.1)",
        tension: 0.25,
        fill: true,
      },
    ],
  };

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: chartData,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: "가격 (KRW)" },
        },
        x: {
          title: { display: true, text: "시간" },
        },
      },
    },
  });
}

// 5초마다 최신 데이터 반영
setInterval(drawChart, 5000);
drawChart();
