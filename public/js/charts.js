/**
 * ExpenseFlow - Chart.js Visualization Engine
 */

let categoryDoughnutChart = null;
let monthlyBarChart = null;

// Initialize or Update All Charts
function updateCharts(expensesList, incomeList = []) {
  if (!window.Chart) {
    console.warn("Chart.js library not loaded yet.");
    return;
  }

  updateCategoryChart(expensesList);
  updateMonthlyChart(expensesList, incomeList);
}

// 1. Expense by Category Doughnut Chart (Responsive for Mobile)
function updateCategoryChart(expensesList) {
  const canvas = document.getElementById('category-chart-canvas');
  if (!canvas) return;

  // Aggregate amounts by category
  const categoriesMap = {};
  expensesList.forEach(item => {
    const cat = item.category || 'Other';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + (parseFloat(item.amount) || 0);
  });

  const labels = Object.keys(categoriesMap);
  const dataValues = Object.values(categoriesMap);

  const colorsMap = {
    'Food': '#f59e0b',
    'Transport': '#3b82f6',
    'Shopping': '#ec4899',
    'Bills': '#ef4444',
    'Entertainment': '#8b5cf6',
    'Health': '#10b981',
    'Education': '#06b6d4',
    'Travel': '#14b8a6',
    'Other': '#64748b'
  };

  const bgColors = labels.map(label => colorsMap[label] || '#a78bfa');

  const isMobile = window.innerWidth < 768;
  const legendPosition = isMobile ? 'bottom' : 'right';

  if (categoryDoughnutChart) {
    categoryDoughnutChart.data.labels = labels;
    categoryDoughnutChart.data.datasets[0].data = dataValues;
    categoryDoughnutChart.data.datasets[0].backgroundColor = bgColors;
    categoryDoughnutChart.options.plugins.legend.position = legendPosition;
    categoryDoughnutChart.update();
  } else {
    const ctx = canvas.getContext('2d');
    categoryDoughnutChart = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#131024',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: legendPosition,
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: isMobile ? 11 : 12 },
              padding: isMobile ? 8 : 14,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#1e193b',
            titleColor: '#f8fafc',
            bodyColor: '#a78bfa',
            borderColor: 'rgba(139, 92, 246, 0.3)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                return ` ${context.label}: $${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        cutout: isMobile ? '60%' : '68%'
      }
    });
  }
}

// 2. Combined Monthly Income & Expenses Comparison Chart (Fully Mobile Responsive)
function updateMonthlyChart(expensesList, incomeList = []) {
  const canvas = document.getElementById('monthly-chart-canvas');
  if (!canvas) return;

  // Build a map of months -> { income: 0, expenses: 0 }
  const monthMap = {};

  // Sort function helper
  const getMonthKeyAndLabel = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    return { sortKey, label };
  };

  // Process expenses
  expensesList.forEach(item => {
    const res = getMonthKeyAndLabel(item.expense_date);
    if (!res) return;
    if (!monthMap[res.sortKey]) {
      monthMap[res.sortKey] = { label: res.label, income: 0, expenses: 0 };
    }
    monthMap[res.sortKey].expenses += (parseFloat(item.amount) || 0);
  });

  // Process income
  incomeList.forEach(item => {
    const res = getMonthKeyAndLabel(item.income_date);
    if (!res) return;
    if (!monthMap[res.sortKey]) {
      monthMap[res.sortKey] = { label: res.label, income: 0, expenses: 0 };
    }
    monthMap[res.sortKey].income += (parseFloat(item.amount) || 0);
  });

  // Sort keys chronologically
  const sortedKeys = Object.keys(monthMap).sort();

  // If no data, show current month placeholder
  if (sortedKeys.length === 0) {
    const now = new Date();
    const currentSortKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    monthMap[currentSortKey] = { label: currentLabel, income: 0, expenses: 0 };
    sortedKeys.push(currentSortKey);
  }

  const labels = sortedKeys.map(k => monthMap[k].label);
  const incomeData = sortedKeys.map(k => monthMap[k].income);
  const expenseData = sortedKeys.map(k => monthMap[k].expenses);

  const isSmallMobile = window.innerWidth < 480;
  const isTablet = window.innerWidth >= 480 && window.innerWidth < 768;

  if (monthlyBarChart) {
    monthlyBarChart.data.labels = labels;
    monthlyBarChart.data.datasets[0].data = incomeData;
    monthlyBarChart.data.datasets[1].data = expenseData;
    monthlyBarChart.options.plugins.legend.labels.font.size = isSmallMobile ? 10 : 12;
    monthlyBarChart.update();
  } else {
    const ctx = canvas.getContext('2d');

    monthlyBarChart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#10b981',
            borderColor: '#34d399',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: '#8b5cf6',
            borderColor: '#c084fc',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: isSmallMobile ? 10 : 12 },
              padding: isSmallMobile ? 8 : 12,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#1e193b',
            titleColor: '#f8fafc',
            bodyColor: '#a78bfa',
            borderColor: 'rgba(139, 92, 246, 0.3)',
            borderWidth: 1,
            padding: isSmallMobile ? 8 : 12,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: $${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: isSmallMobile ? 10 : 11 },
              maxRotation: isSmallMobile ? 45 : 0
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: isSmallMobile ? 10 : 11 },
              callback: function(val) {
                if (val >= 1000) {
                  return '$' + (val / 1000).toFixed(1) + 'k';
                }
                return '$' + val;
              }
            }
          }
        }
      }
    });
  }
}

// Window resize listener to keep charts fitting viewport smoothly
window.addEventListener('resize', debounce(() => {
  if (monthlyBarChart) {
    const isSmallMobile = window.innerWidth < 480;
    monthlyBarChart.options.plugins.legend.labels.font.size = isSmallMobile ? 10 : 12;
    monthlyBarChart.options.scales.x.ticks.font.size = isSmallMobile ? 10 : 11;
    monthlyBarChart.options.scales.y.ticks.font.size = isSmallMobile ? 10 : 11;
    monthlyBarChart.update();
  }
  if (categoryDoughnutChart) {
    const isMobile = window.innerWidth < 768;
    categoryDoughnutChart.options.plugins.legend.position = isMobile ? 'bottom' : 'right';
    categoryDoughnutChart.update();
  }
}, 200));
