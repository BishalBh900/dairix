const ctx = document.getElementById('milkChart').getContext('2d');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: JSON.parse(document.getElementById('chart-labels').textContent),
    datasets: [{
      label: 'Litres',
      data: JSON.parse(document.getElementById('chart-data').textContent),
      backgroundColor: 'rgba(139,105,20,.18)',
      borderColor: '#8B6914',
      borderWidth: 2,
      borderRadius: 6,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,.05)' },
        ticks: { font: { family: 'DM Sans', size: 11 }, color: '#9C8B72' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'DM Sans', size: 11 }, color: '#9C8B72' }
      }
    }
  }
});