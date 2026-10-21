/* ============================================================
   GRÁFICAS CON CHART.JS
   ============================================================ */

let graficaMensual = null;

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/**
 * Gráfica de serie temporal estilo PVGIS — línea roja continua.
 */
function dibujarGraficaSerieTemporal(puntos) {
  const ctx = document.getElementById('graficaMensual').getContext('2d');
  if (graficaMensual) graficaMensual.destroy();

  const etiquetas = puntos.map(p => `${p.anio}-${String(p.mes).padStart(2,'0')}`);
  const valores = puntos.map(p => p.suma);

  graficaMensual = new Chart(ctx, {
    type: 'line',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Irradiación directa normal (kWh/m²)',
        data: valores,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.05)',
        borderWidth: 1.5,
        fill: false,
        tension: 0.15,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#dc2626',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1e3a8a',
          bodyColor: '#374151',
          borderColor: '#dc2626',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const p = puntos[items[0].dataIndex];
              return `${MESES[p.mes - 1]} ${p.anio}`;
            },
            label: (item) =>
              `Irradiación directa normal: ${item.parsed.y.toFixed(2)} kWh/m²`
          }
        },
        title: {
          display: true,
          text: 'Irradiación solar mensual',
          font: { size: 14 }
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: 12,
            callback: function(val) {
              const et = this.getLabelForValue(val);
              return et ? et.slice(0, 4) : '';
            },
            font: { size: 10 }
          },
          grid: { display: false }
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Irradiación mensual [kWh/m²]',
            font: { size: 11 }
          },
          grid: { color: '#e5e7eb' },
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}