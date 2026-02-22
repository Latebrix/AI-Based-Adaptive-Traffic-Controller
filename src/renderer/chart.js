// --- Flow Chart Setup ---
const MAX_DATA_POINTS = 20;
let flowChart;

function initChart() {
    const ctxC = document.getElementById('flowChart').getContext('2d');

    // creating a cool gradient for the line graph
    const gradient = ctxC.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(0, 122, 204, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 122, 204, 0.0)');

    // setting up Chart.js
    flowChart = new Chart(ctxC, {
        type: 'line',
        data: {
            labels: Array(MAX_DATA_POINTS).fill(''),
            datasets: [{
                label: 'Flow Rate (Cars per sec)',
                data: Array(MAX_DATA_POINTS).fill(0), // start with zeros
                borderColor: '#007acc',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // turning off animation so it doesn't lag our app!
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#333' },
                    ticks: { color: '#888' }
                },
                x: {
                    display: false // looks cleaner without x-axis labels
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// helper to push new numbers into our graph
function addDataToChart(value) {
    if (!flowChart) return;
    const data = flowChart.data.datasets[0].data;
    data.shift(); // remove the oldest point
    data.push(value); // add the newest point
    flowChart.update();
}

initChart();
