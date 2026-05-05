

const cfg           = document.getElementById('salesConfig').dataset;
const dailyLabels   = JSON.parse(cfg.dailyLabels);
const dailyData     = JSON.parse(cfg.dailyData);
const monthlyLabels = JSON.parse(cfg.monthlyLabels);
const monthlyData   = JSON.parse(cfg.monthlyData);
const farmerNames   = JSON.parse(cfg.farmerNames);
const farmerRevs    = JSON.parse(cfg.farmerRevs);

const amber = '#f59e0b';
const green = '#10b981';
const muted = '#6b7280';
const grid  = 'rgba(0,0,0,0.06)';
const font  = { size: 11 };

/* ── Daily Bar Chart ── */
new Chart(document.getElementById('dailyChart'), {
  type: 'bar',
  data: {
    labels: dailyLabels,
    datasets: [{
      label: 'Sales (Rs.)',
      data: dailyData,
      backgroundColor: dailyData.map((_, i) =>
        i === dailyData.length - 1 ? amber : 'rgba(245,158,11,0.25)'
      ),
      borderColor: amber,
      borderWidth: 1.5,
      borderRadius: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => ' Rs.' + c.parsed.y.toFixed(2) } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: muted, font } },
      y: { grid: { color: grid },    ticks: { color: muted, font, callback: v => 'Rs.' + v } }
    }
  }
});

/* ── Monthly Line Chart ── */
new Chart(document.getElementById('monthlyChart'), {
  type: 'line',
  data: {
    labels: monthlyLabels,
    datasets: [{
      label: 'Revenue (Rs.)',
      data: monthlyData,
      borderColor: green,
      backgroundColor: 'rgba(16,185,129,0.08)',
      borderWidth: 2.5,
      pointBackgroundColor: green,
      pointRadius: 4,
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => ' Rs.' + c.parsed.y.toFixed(2) } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: muted, font } },
      y: { grid: { color: grid },    ticks: { color: muted, font, callback: v => 'Rs.' + v } }
    }
  }
});

/* ── Farmer Doughnut ── */
if (farmerNames.length > 0) {
  new Chart(document.getElementById('farmerChart'), {
    type: 'doughnut',
    data: {
      labels: farmerNames,
      datasets: [{
        data: farmerRevs,
        backgroundColor: ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: muted, font, boxWidth: 10, padding: 10 }
        },
        tooltip: { callbacks: { label: c => ' Rs.' + c.parsed.toFixed(2) } }
      }
    }
  });
} else {
  const canvas = document.getElementById('farmerChart');
  canvas.style.display = 'none';
  canvas.insertAdjacentHTML(
    'afterend',
    '<p style="text-align:center;color:#9ca3af;font-size:13px;padding-top:70px;">No farmer data yet</p>'
  );
}
const productNames = JSON.parse(cfg.productNames);
const productRevs  = JSON.parse(cfg.productRevs);

if (productNames.length > 0) {
  new Chart(document.getElementById('productChart'), {
    type: 'doughnut',
    data: {
      labels: productNames,
      datasets: [{
        data: productRevs,
        backgroundColor: ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: muted, font, boxWidth: 10, padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: c => {
              const total = c.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((c.parsed / total) * 100).toFixed(1);
              return ` Rs.${c.parsed.toFixed(2)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
} else {
  const canvas = document.getElementById('productChart');
  canvas.style.display = 'none';
  canvas.insertAdjacentHTML(
    'afterend',
    '<p style="text-align:center;color:#9ca3af;font-size:13px;padding-top:70px;">No product data yet</p>'
  );
}