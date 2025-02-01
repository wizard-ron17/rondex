// Google Sheets API configuration
const API_KEY = 'AIzaSyAQiOsVDU8EPtSRTh2jioOOX1zymwt5UnI';
const SPREADSHEET_ID = '10W6lR7yZNxwaZLaUOMnhP1FwFLN2i6z0FNV0ANBnG1M';
const SHEETS = {
    BETS: 'Aaron!A1:Z1000',
    BALANCES: 'Balances!A1:O1000'
};
// ------------------------------

function formatCurrency(value) {
    if (typeof value === 'string') {
        value = parseFloat(value.replace('$', ''));
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function formatPercent(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

function calculateStats(rows) {
    const totalWagers = rows.reduce((sum, row) => sum + parseFloat(row[4].replace(/[$,]/g, '')), 0);
    const totalProfit = rows.reduce((sum, row) => sum + parseFloat(row[6].replace(/[$,]/g, '')), 0);
    const avgRoi = rows.reduce((sum, row) => sum + parseFloat(row[7].replace('%', '')), 0) / rows.length;
    const betCount = rows.length;

    document.getElementById('total-wagers').textContent = formatCurrency(totalWagers);
    document.getElementById('total-profit').textContent = formatCurrency(totalProfit);
    document.getElementById('avg-roi').textContent = formatPercent(avgRoi);
    document.getElementById('bet-count').textContent = betCount;
}

function displayData(values) {
    const headers = values[0];
    const rows = values.slice(1);
    let tableContent = '';
    
    rows.forEach((row, index) => {
        tableContent += `
            <tr class="clickable" onclick="toggleDetails(${index})">
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[2]}</td>
                <td>${row[3]}</td>
                <td>${row[4]}</td>
                <td class="profit ${parseFloat(row[6].replace(/[$,]/g, '')) > 0 ? 'positive' : ''}">${row[6]}</td>
                <td>${row[7]}</td>
            </tr>
            <tr>
                <td colspan="7" class="bet-details" id="details-${index}">
                    <div class="bet-details-grid">
                        <div class="bet-details-item">
                            <span class="bet-details-label">Sportsbook A</span>
                            <span>${row[8]}</span>
                        </div>
                        <div class="bet-details-item">
                            <span class="bet-details-label">Prop A</span>
                            <span>${row[9]}</span>
                        </div>
                        <div class="bet-details-item">
                            <span class="bet-details-label">Odds A</span>
                            <span>${row[10]}</span>
                        </div>
                        <div class="bet-details-item">
                            <span class="bet-details-label">Sportsbook B</span>
                            <span>${row[13]}</span>
                        </div>
                        <div class="bet-details-item">
                            <span class="bet-details-label">Prop B</span>
                            <span>${row[14]}</span>
                        </div>
                        <div class="bet-details-item">
                            <span class="bet-details-label">Odds B</span>
                            <span>${row[15]}</span>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    document.getElementById('data').innerHTML = tableContent;
    calculateStats(rows);
    document.querySelector('.loading').style.display = 'none';
}

function toggleDetails(index) {
    const details = document.getElementById(`details-${index}`);
    const currentDisplay = details.style.display;
    details.style.display = currentDisplay === 'block' ? 'none' : 'block';
}

function updateBalances(values) {
    if (values.length < 2) return;
    
    // Get the last row of data for current balances
    const lastRow = values[values.length - 1];
    
    // Map column indices to sportsbook IDs
    const balanceMap = {
        1: 'draftkings',
        2: 'fanduel',
        3: 'betrivers',
        4: 'espnbet',
        5: 'betmgm',
        6: 'fanatics',
        7: 'caesars'
    };

    let total = 0;

    // Update individual balances
    Object.entries(balanceMap).forEach(([index, id]) => {
        // Remove any $ signs and convert to float
        const balance = parseFloat(lastRow[index].replace(/[$,]/g, '')) || 0;
        document.getElementById(`${id}-balance`).textContent = formatCurrency(balance);
        total += balance;
    });

    // Update total balance
    document.getElementById('total-balance').textContent = formatCurrency(total);
}

let balanceChart = null;
let values = [];

function initializeChart(data) {
    // Skip header, get data in chronological order (oldest to newest)
    const chartData = data.slice(1).reverse(); // This reverses newest-first to oldest-first
    const dates = chartData.map(row => row[0]); // Now dates will be oldest to newest

    // Define sportsbooks and their colors
    const sportsbooks = [
        { name: 'Total Balance', index: 'total', color: '#ffffff' },
        { name: 'DraftKings', index: 1, color: '#00dc00' },
        { name: 'Fanduel', index: 2, color: '#1c64d9' },
        { name: 'BetRivers', index: 3, color: '#f2c800' },
        { name: 'ESPNBet', index: 4, color: '#00ff87' },
        { name: 'BetMGM', index: 5, color: '#d4af37' },
        { name: 'Fanatics', index: 6, color: '#ff0000' },
        { name: 'Caesars', index: 7, color: '#ffd700' }
    ];

    // Create datasets for each sportsbook and total
    const datasets = sportsbooks.map(book => {
        let data;
        if (book.index === 'total') {
            // Calculate total balance for each date
            data = chartData.map(row => {
                let total = 0;
                for (let i = 1; i <= 7; i++) {
                    total += parseFloat(row[i].replace(/[$,]/g, '')) || 0;
                }
                return total;
            });
        } else {
            // Get individual sportsbook data
            data = chartData.map(row => 
                parseFloat(row[book.index].replace(/[$,]/g, '')) || 0
            );
        }

        return {
            label: book.name,
            data: data,
            borderColor: book.color,
            tension: 0.1,
            fill: false,
            borderWidth: book.index === 'total' ? 3 : 1,
            order: book.index === 'total' ? 0 : 1
        };
    });

    // Create chart
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (balanceChart) {
        balanceChart.destroy();
    }
    balanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Sportsbook Balances Over Time',
                    color: '#ffffff',
                    font: {
                        size: 14
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 10,
                        usePointStyle: true,
                        boxWidth: 6,
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#333',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    reverse: false,
                    ticks: { 
                        color: '#b3b3b3',
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 8
                        },
                        maxTicksLimit: 6
                    },
                    grid: { color: '#333' }
                },
                y: {
                    ticks: { 
                        color: '#b3b3b3',
                        callback: value => '$' + value.toLocaleString(),
                        font: {
                            size: 10
                        }
                    },
                    grid: { color: '#333' },
                    beginAtZero: true
                }
            }
        }
    });
}

function fetchBalances() {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEETS.BALANCES}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.values && data.values.length > 0) {
                values = data.values;
                updateBalances(data.values);
                initializeChart(data.values);
            }
        })
        .catch(error => {
            console.error('Error loading balances:', error);
        });
}

// Add tab functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and content
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-content`).classList.add('active');
        });
    });

    // Initial data fetch
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEETS.BETS}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.values && data.values.length > 0) {
                displayData(data.values);
            } else {
                document.querySelector('.error').textContent = 'No data found in spreadsheet.';
                document.querySelector('.error').style.display = 'block';
                document.querySelector('.loading').style.display = 'none';
            }
        })
        .catch(error => {
            document.querySelector('.error').textContent = 'Error loading data: ' + error.message;
            document.querySelector('.error').style.display = 'block';
            document.querySelector('.loading').style.display = 'none';
        });

    // Fetch balances
    fetchBalances();
});