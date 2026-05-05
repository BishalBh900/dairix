Chart.defaults.font.family = 'sans-serif';

const rawLabels = JSON.parse(document.getElementById('chart-labels').textContent);
const rawData   = JSON.parse(document.getElementById('chart-data').textContent);

const labels = Array.isArray(rawLabels) ? rawLabels : JSON.parse(rawLabels);

const ctx = document.getElementById('milkChart').getContext('2d');

const gradient = ctx.createLinearGradient(0, 0, 0, 300);
gradient.addColorStop(0, 'rgba(22, 163, 74, 0.8)');   // ← stronger top
gradient.addColorStop(0.7, 'rgba(22, 163, 74, 0.5)');  // ← add mid stop
gradient.addColorStop(1, 'rgba(22, 163, 74, 0.15)');  // ← subtle bottom

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: labels,
    datasets: [{
  label: 'Litres',
  data: rawData,
  backgroundColor: gradient,
  borderColor: '#16a34a',
  borderWidth: 1.5,      // ← was 2
  borderRadius: 10,
  borderSkipped: false,
  barThickness: 40,      // ← was 32
}]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        titleColor: '#111827',
        bodyColor: '#16a34a',
        padding: 10,
        callbacks: {
          label: ctx => `  ${ctx.parsed.y.toFixed(1)} L`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        border: { display: false },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
          stepSize: 50,   
          callback: v => v + ' L'
        }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
        }
      }
    }
  }
});