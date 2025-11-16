import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Title, Tooltip);

function App() {
  const [priceData, setPriceData] = useState([]);

  // ⏱ 5초마다 /price-feed 호출
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:4000/price-feed");
        if (res.data.ok) setPriceData(res.data.data);
      } catch (err) {
        console.error("데이터 불러오기 실패:", err);
      }
    };

    fetchData(); // 첫 실행
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const data = {
    labels: priceData.map((p) => p.blockNumber),
    datasets: [
      {
        label: "sFIAT / KRW 가격",
        data: priceData.map((p) => p.price),
        borderColor: "#22c55e",
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "🇰🇷 sFIAT (KRW 연동 스테이블코인) 실시간 가격 시뮬레이션",
      },
      legend: { display: false },
    },
    scales: {
      y: {
        min: 0.95,
        max: 1.05,
        title: { display: true, text: "가격 (KRW)" },
      },
      x: {
        title: { display: true, text: "Block Number" },
      },
    },
  };

  return (
    <div style={{ width: "900px", margin: "50px auto", textAlign: "center" }}>
      <h2>💰 sFIAT (1 KRW Peg) 실시간 차트</h2>
      <Line data={data} options={options} />
      <p>차트는 5초마다 자동 갱신됩니다 ⏱</p>
    </div>
  );
}

export default App;
