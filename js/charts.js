/* ============================================================
   ClinAxis — Charts.js wrapper
   ============================================================ */

const Charts = {
  _instances: {},

  _chartColors(n) {
    return Utils.chartColors.slice(0, n);
  },

  _baseOptions() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    return {
      gridColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
      tickColor: isDark ? '#64748B' : '#94A3B8',
      bgColor: isDark ? '#111827' : '#FFFFFF',
    };
  },

  destroy(id) {
    if (Charts._instances[id]) {
      Charts._instances[id].destroy();
      delete Charts._instances[id];
    }
  },

  destroyAll() {
    Object.keys(Charts._instances).forEach(id => Charts.destroy(id));
  },

  // ── Line chart for time series ──
  // Accepts: line(id, labels, datasets) OR line(id, { labels, datasets, ... })
  line(canvasId, labelsOrOpts, datasetsArg) {
    let labels, datasets, title = '', yLabel = '', xLabel = 'Fecha';
    if (Array.isArray(labelsOrOpts)) {
      labels = labelsOrOpts; datasets = datasetsArg || [];
    } else {
      ({ labels, datasets, title = '', yLabel = '', xLabel = 'Fecha' } = labelsOrOpts || {});
    }
    Charts.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { gridColor, tickColor } = Charts._baseOptions();

    const chartDatasets = datasets.map((ds, i) => {
      const c = ds.color || ds.borderColor || Utils.chartColors[i % Utils.chartColors.length];
      return {
        label: ds.label,
        data: ds.data,
        borderColor: ds.borderColor || c,
        backgroundColor: ds.backgroundColor || (c + '22'),
        tension: ds.tension ?? 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: c,
        fill: ds.fill !== undefined ? ds.fill : (datasets.length === 1),
        borderWidth: 2,
        spanGaps: true,
      };
    });

    Charts._instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: { color: tickColor, font: { family: "'Source Sans 3', sans-serif", size: 11 }, boxWidth: 10, padding: 12 }
          },
          title: {
            display: !!title,
            text: title,
            color: tickColor,
            font: { family: "'Sora', sans-serif", size: 12, weight: '600' },
            padding: { bottom: 12 }
          },
          tooltip: {
            backgroundColor: document.documentElement.dataset.theme === 'dark' ? '#1A2236' : '#0F172A',
            titleColor: '#F1F5F9',
            bodyColor: '#94A3B8',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: tickColor, font: { family: "'Source Sans 3', sans-serif", size: 11 } },
            grid: { color: gridColor }
          },
          y: {
            ticks: { color: tickColor, font: { family: "'Source Sans 3', sans-serif", size: 11 } },
            grid: { color: gridColor },
            title: { display: !!yLabel, text: yLabel, color: tickColor, font: { size: 11 } }
          }
        }
      }
    });
    return Charts._instances[canvasId];
  },

  // ── Bar chart ──
  // Accepts: bar(id, labels, datasets) OR bar(id, { labels, datasets, ... })
  bar(canvasId, labelsOrOpts, datasetsArg) {
    let labels, datasets, title = '', yLabel = '', stacked = false;
    if (Array.isArray(labelsOrOpts)) {
      labels = labelsOrOpts; datasets = datasetsArg || [];
    } else {
      ({ labels, datasets, title = '', yLabel = '', stacked = false } = labelsOrOpts || {});
    }
    Charts.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { gridColor, tickColor } = Charts._baseOptions();

    const chartDatasets = datasets.map((ds, i) => {
      const c = ds.color || ds.borderColor || Utils.chartColors[i % Utils.chartColors.length];
      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.backgroundColor || (c + 'CC'),
        borderColor: ds.borderColor || c,
        borderWidth: 1,
        borderRadius: 4,
      };
    });

    Charts._instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: { color: tickColor, font: { family: "'Source Sans 3', sans-serif", size: 11 }, boxWidth: 10 }
          },
          title: {
            display: !!title,
            text: title,
            color: tickColor,
            font: { family: "'Sora', sans-serif", size: 12, weight: '600' }
          },
          tooltip: {
            backgroundColor: document.documentElement.dataset.theme === 'dark' ? '#1A2236' : '#0F172A',
            titleColor: '#F1F5F9', bodyColor: '#94A3B8',
          }
        },
        scales: {
          x: { stacked, ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor } },
          y: { stacked, ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor },
            title: { display: !!yLabel, text: yLabel, color: tickColor } }
        }
      }
    });
    return Charts._instances[canvasId];
  },

  // ── Radar chart ──
  // Accepts: radar(id, labels, datasets) OR radar(id, { labels, datasets, ... })
  radar(canvasId, labelsOrOpts, datasetsArg) {
    let labels, datasets, title = '';
    if (Array.isArray(labelsOrOpts)) {
      labels = labelsOrOpts; datasets = datasetsArg || [];
    } else {
      ({ labels, datasets, title = '' } = labelsOrOpts || {});
    }
    Charts.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { tickColor } = Charts._baseOptions();

    const chartDatasets = datasets.map((ds, i) => {
      const c = ds.color || ds.borderColor || Utils.chartColors[i % Utils.chartColors.length];
      return {
        label: ds.label,
        data: ds.data,
        borderColor: ds.borderColor || c,
        backgroundColor: ds.backgroundColor || (c + '33'),
        borderWidth: 2,
        pointBackgroundColor: c,
        pointRadius: 3,
      };
    });

    Charts._instances[canvasId] = new Chart(canvas, {
      type: 'radar',
      data: { labels, datasets: chartDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: tickColor, font: { size: 11 } } },
          title: { display: !!title, text: title, color: tickColor, font: { size: 12, weight: '600' } },
          tooltip: {
            backgroundColor: document.documentElement.dataset.theme === 'dark' ? '#1A2236' : '#0F172A',
            titleColor: '#F1F5F9', bodyColor: '#94A3B8',
          }
        },
        scales: {
          r: {
            ticks: { color: tickColor, font: { size: 10 }, backdropColor: 'transparent' },
            grid: { color: document.documentElement.dataset.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
            pointLabels: { color: tickColor, font: { size: 11 } }
          }
        }
      }
    });
    return Charts._instances[canvasId];
  },

  // ── Doughnut ──
  doughnut(canvasId, { labels, data, colors, title = '' } = {}) {
    Charts.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { tickColor } = Charts._baseOptions();

    Charts._instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors || Utils.chartColors.map(c => c + 'CC'), borderWidth: 2, borderColor: 'transparent' }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tickColor, font: { size: 11 }, padding: 10, boxWidth: 10 }
          },
          title: { display: !!title, text: title, color: tickColor, font: { size: 12, weight: '600' } },
          tooltip: {
            backgroundColor: document.documentElement.dataset.theme === 'dark' ? '#1A2236' : '#0F172A',
            titleColor: '#F1F5F9', bodyColor: '#94A3B8',
          }
        }
      }
    });
    return Charts._instances[canvasId];
  },

  // ── Mini sparkline (simple inline SVG-based) ──
  sparkline(values, { color = '#3B82F6', width = 80, height = 32, direction = 'neutral' } = {}) {
    if (!values || values.length < 2) return `<svg width="${width}" height="${height}"></svg>`;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const xs = values.map((_, i) => (i / (values.length - 1)) * width);
    const ys = values.map(v => height - ((v - min) / range) * (height - 4) - 2);
    const points = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
    const trend = Utils.getTrend(values, direction);
    const strokeColor = trend === 'better' ? '#10B981' : trend === 'worse' ? '#EF4444' : color;
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <polyline points="${points}" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${xs[xs.length-1]}" cy="${ys[ys.length-1]}" r="2.5" fill="${strokeColor}"/>
    </svg>`;
  }
};
