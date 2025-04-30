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

    const profitPercentage = totalWagers > 0 ? (totalProfit / totalWagers) * 100 : 0;

    document.getElementById('total-wagers').textContent = formatCurrency(totalWagers);
    document.getElementById('total-profit').innerHTML = `${formatCurrency(totalProfit)} <span style="color: #b3b3b3; font-size: 0.9rem;">(${profitPercentage.toFixed(2)}%)</span>`;
    document.getElementById('avg-roi').textContent = formatPercent(avgRoi);
    document.getElementById('bet-count').textContent = betCount;
}

function parseDate(dateStr) {
    const [month, day, year] = dateStr.split('/');
    // Convert to YYYY-MM-DD format for proper comparison
    return new Date(`20${year}`, month - 1, day);
}

function getColumnIndex(sortKey) {
    const columnMap = {
        'date': 0,
        'wager': 1,
        'profit': 2,
        'roi': 3,
        'sport': 4,
        'event': 5,
        'title': 6
    };
    return columnMap[sortKey];
}

function sortTable(sortKey, isAscending) {
    const tbody = document.getElementById('data');
    const rows = Array.from(tbody.getElementsByTagName('tr'));
    const headers = document.querySelectorAll('th[data-sort]');

    // Reset all headers except the current one
    headers.forEach(header => {
        if (header.getAttribute('data-sort') !== sortKey) {
            header.classList.remove('asc');
        }
    });

    rows.sort((a, b) => {
        const aValue = a.cells[getColumnIndex(sortKey)].textContent;
        const bValue = b.cells[getColumnIndex(sortKey)].textContent;
        
        if (sortKey === 'date') {
            const dateA = parseDate(aValue);
            const dateB = parseDate(bValue);
            return isAscending ? dateA - dateB : dateB - dateA;
        } else if (sortKey === 'wager' || sortKey === 'profit') {
            const numA = parseFloat(aValue.replace(/[$,]/g, ''));
            const numB = parseFloat(bValue.replace(/[$,]/g, ''));
            return isAscending ? numA - numB : numB - numA;
        } else if (sortKey === 'roi') {
            const numA = parseFloat(aValue.replace('%', ''));
            const numB = parseFloat(bValue.replace('%', ''));
            return isAscending ? numA - numB : numB - numA;
        } else {
            return isAscending ? 
                aValue.localeCompare(bValue) : 
                bValue.localeCompare(aValue);
        }
    });

    // Clear and re-append sorted rows
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    rows.forEach(row => tbody.appendChild(row));
}

function displayData(values) {
    const headers = values[0];
    const rows = values.slice(1);
    
    // Sort rows by date in descending order by default
    rows.sort((a, b) => {
        const dateA = parseDate(a[0]);
        const dateB = parseDate(b[0]);
        return dateB - dateA;
    });
    
    let tableContent = '';
    rows.forEach((row, index) => {
        tableContent += `
            <tr class="clickable" onclick="showBetModal(${JSON.stringify(row).replace(/"/g, '&quot;')})">
                <td>${row[0]}</td>
                <td>${row[4]}</td>
                <td>${row[6]}</td>
                <td class="profit ${parseFloat(row[7].replace(/[$,]/g, '')) > 0 ? 'positive' : ''}">${row[7]}</td>
                <td>${row[1]}</td>
                <td>${row[2]}</td>
                <td>${row[3]}</td>
            </tr>
        `;
    });
    
    document.getElementById('data').innerHTML = tableContent;
    calculateStats(rows);
    document.querySelector('.loading').style.display = 'none';
    
    // Update the date header to show it's sorted in descending order
    const dateHeader = document.querySelector('th[data-sort="date"]');
    dateHeader.classList.remove('asc');
}

function calculatePotentialOutcomes(rowData) {
    // Check if it's an open bet (Total Won is empty)
    if (!rowData[5]) {
        const wagerA = parseFloat(rowData[11].replace(/[$,]/g, ''));
        const wagerB = parseFloat(rowData[16].replace(/[$,]/g, ''));
        const toWinA = parseFloat(rowData[12].replace(/[$,]/g, ''));
        const toWinB = parseFloat(rowData[17].replace(/[$,]/g, ''));
        
        // Calculate outcomes
        const outcomeA = {
            win: toWinA - wagerB,
            description: `If ${rowData[8]} wins: Win ${formatCurrency(toWinA)} - ${formatCurrency(wagerB)} hedge`
        };
        
        const outcomeB = {
            win: toWinB - wagerA,
            description: `If ${rowData[13]} wins: Win ${formatCurrency(toWinB)} - ${formatCurrency(wagerA)} hedge`
        };
        
        return {
            minWin: Math.min(outcomeA.win, outcomeB.win),
            maxWin: Math.max(outcomeA.win, outcomeB.win),
            scenarios: [outcomeA.description, outcomeB.description]
        };
    }
    return null;
}

// Add helper function to calculate arbitrage outcomes
function calculateArbitrageOutcomes(rowData) {
    // Check if it's an open bet (Total Won is empty)
    if (!rowData[5]) {
        const wagerA = parseFloat(rowData[11].replace(/[$,]/g, ''));
        const wagerB = parseFloat(rowData[16].replace(/[$,]/g, ''));
        const toWinA = parseFloat(rowData[12].replace(/[$,]/g, ''));
        const toWinB = parseFloat(rowData[17].replace(/[$,]/g, ''));
        const totalWager = wagerA + wagerB;
        
        // Calculate profit range
        const profitA = toWinA - totalWager;
        const profitB = toWinB - totalWager;
        
        // Calculate ROI range (as percentages)
        const roiA = (profitA / totalWager) * 100;
        const roiB = (profitB / totalWager) * 100;
        
        return {
            minProfit: Math.min(profitA, profitB),
            maxProfit: Math.max(profitA, profitB),
            minRoi: Math.min(roiA, roiB),
            maxRoi: Math.max(roiA, roiB)
        };
    }
    return null;
}

// Update the showBetModal function's middle column content
function showBetModal(rowData) {
    const modal = document.getElementById('betModal');
    console.log('Modal element:', modal); // Debug log
    
    // Check each element before setting content
    const elements = {
        eventTitle: document.getElementById('modal-event-title'),
        betTitle: document.getElementById('modal-bet-title'),
        date: document.getElementById('modal-date'),
        sbookAName: document.getElementById('sportsbook-a-name'),
        betTypeA: document.getElementById('bet-type-a'),
        oddsA: document.getElementById('odds-a'),
        wagerA: document.getElementById('wager-a'),
        toWinA: document.getElementById('to-win-a'),
        sbookBName: document.getElementById('sportsbook-b-name'),
        betTypeB: document.getElementById('bet-type-b'),
        oddsB: document.getElementById('odds-b'),
        wagerB: document.getElementById('wager-b'),
        toWinB: document.getElementById('to-win-b'),
        totalWager: document.getElementById('total-wager'),
        potentialProfit: document.getElementById('potential-profit'),
        potentialRoi: document.getElementById('potential-roi')
    };
    
    // Debug log to see which elements are null
    console.log('Elements:', elements);
    
    // Only proceed if all elements exist
    if (Object.values(elements).every(el => el !== null)) {
        elements.eventTitle.textContent = `${rowData[1]} | ${rowData[2]}`;
        elements.betTitle.textContent = rowData[3];
        elements.date.textContent = rowData[0];
        
        elements.sbookAName.textContent = rowData[8];
        elements.betTypeA.textContent = rowData[9];
        elements.oddsA.textContent = rowData[10];
        elements.wagerA.textContent = formatCurrency(rowData[11]);
        elements.toWinA.textContent = formatCurrency(rowData[12]);
        
        elements.sbookBName.textContent = rowData[13];
        elements.betTypeB.textContent = rowData[14];
        elements.oddsB.textContent = rowData[15];
        elements.wagerB.textContent = formatCurrency(rowData[16]);
        elements.toWinB.textContent = formatCurrency(rowData[17]);
        
        const totalWager = parseFloat(rowData[4].replace(/[$,]/g, ''));
        elements.totalWager.textContent = formatCurrency(totalWager);
        
        const profit = parseFloat(rowData[6].replace(/[$,]/g, ''));
        const roi = parseFloat(rowData[7].replace('%', ''));
        
        if (profit < 0 && roi === -100) {
            const outcomes = calculateArbitrageOutcomes(rowData);
            elements.potentialProfit.textContent = 
                `${formatCurrency(outcomes.minProfit)} - ${formatCurrency(outcomes.maxProfit)}`;
            elements.potentialRoi.textContent = 
                `${outcomes.minRoi.toFixed(2)}% - ${outcomes.maxRoi.toFixed(2)}%`;
            
            document.getElementById('profit-label').textContent = 'Potential Profit';
            document.getElementById('roi-label').textContent = 'Potential ROI';
        } else {
            elements.potentialProfit.textContent = formatCurrency(profit);
            elements.potentialRoi.textContent = `${roi.toFixed(2)}%`;
            
            document.getElementById('profit-label').textContent = 'Profit';
            document.getElementById('roi-label').textContent = 'ROI';
        }
        
        modal.style.display = 'block';
    } else {
        console.error('Some elements are missing from the DOM');
        // Log which elements are missing
        Object.entries(elements).forEach(([key, value]) => {
            if (value === null) {
                console.error(`Missing element: ${key}`);
            }
        });
    }
}

// Add event listeners for the modal
document.addEventListener('DOMContentLoaded', function() {
    // ... (keep existing DOMContentLoaded content) ...

    // Add modal close functionality
    const modal = document.getElementById('betModal');
    const closeBtn = document.querySelector('.close-modal');

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }

    // Add keyboard support for closing modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });

    // Add event listeners for sorting
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.getAttribute('data-sort');
            const isAscending = header.classList.toggle('asc');
            sortTable(sortKey, isAscending);
        });
    });
});

function getBalanceColor(balance) {
    if (balance < 50) return '#ff4444';  // Red
    if (balance < 150) return '#ffeb3b';  // Yellow
    if (balance >= 200) return '#4caf50';  // Green
    return '#ffffff';  // Default white
}

function updateBalances(values) {
    if (values.length < 2) return;
    
    const lastRow = values[values.length - 1];
    
    const balanceMap = {
        1: 'draftkings',
        2: 'fanduel',
        3: 'betrivers',
        4: 'espnbet',
        5: 'betmgm',
        6: 'fanatics',
        7: 'caesars',
        8: 'novig',
        9: 'prophetx',
        10: 'rebet',
        11: 'betonline',
        12: 'fliff',
        13: 'mybookie'
    };

    let total = 0;

    // Update individual balances
    Object.entries(balanceMap).forEach(([index, id]) => {
        const balance = parseFloat(lastRow[index].replace(/[$,]/g, '')) || 0;
        const element = document.getElementById(`${id}-balance`);
        element.textContent = formatCurrency(balance);
        element.style.color = getBalanceColor(balance);
        total += balance;
    });

    // Update total balance (always white)
    document.getElementById('total-balance').textContent = formatCurrency(total);
    document.getElementById('total-balance').style.color = '#ffffff';
}

let balanceChart = null;
let values = [];

function initializeChart(data) {
    // Skip header, get data in chronological order (oldest to newest)
    const chartData = data.slice(1).reverse(); // This reverses newest-first to oldest-first
    const dates = chartData.map(row => row[0]); // Now dates will be oldest to newest

    // Define sportsbooks and their colors
    const sportsbooks = [
        { name: 'Total Balance', index: 'total', color: '#777777' },
        { name: 'DraftKings', index: 1, color: '#00dc00' },
        { name: 'Fanduel', index: 2, color: '#1c64d9' },
        { name: 'BetRivers', index: 3, color: '#ffff00' },
        { name: 'ESPNBet', index: 4, color: '#66ffcc' },
        { name: 'BetMGM', index: 5, color: '#d4af37' },
        { name: 'Fanatics', index: 6, color: '#ff0000' },
        { name: 'Caesars', index: 7, color: '#006600' },
        { name: 'Novig', index: 8, color: '#ffffff' },
        { name: 'ProphetX', index: 9, color: '#60c1a0' },
        { name: 'Rebet', index: 10, color: '#ff7c34' },
        { name: 'BetOnline', index: 11, color: '#ff3a3c' },
        { name: 'Fliff', index: 12, color: '#80cfda' },
        { name: 'MyBookie', index: 13, color: '#f99b2e' }
    ];

    // Create datasets for each sportsbook and total
    const datasets = sportsbooks.map(book => {
        let data;
        if (book.index === 'total') {
            // Calculate total balance for each date
            data = chartData.map(row => {
                let total = 0;
                for (let i = 1; i <= 13; i++) {
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
                    reverse: true,
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
    
    // Function to switch tabs
    function switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to selected tab and content
        const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
            document.getElementById(`${tabName}-content`).classList.add('active');
            
            // Initialize specific tab content
            if (tabName === 'calendar') {
                createCalendar();
            } else if (tabName === 'stats') {
                fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEETS.BETS}?key=${API_KEY}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.values && data.values.length > 0) {
                            createProfitChart(data.values);
                        }
                    });
            }
        }
    }

    // Handle tab clicks
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            window.location.hash = tabName; // Update URL hash when clicking tabs
            switchTab(tabName);
        });
    });

    // Handle initial load and hash changes
    function handleHashChange() {
        const hash = window.location.hash.slice(1) || 'bets'; // Default to 'bets' if no hash
        switchTab(hash);
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Handle initial page load
    handleHashChange();
});

let profitChart = null;

function createProfitChart(data) {
    const rows = data.slice(1); // Skip header row
    
    // Process daily profits
    const dailyProfits = rows.reduce((acc, row) => {
        const date = row[0];
        const profit = parseFloat(row[6].replace(/[$,]/g, '')) || 0;
        
        if (!acc[date]) {
            acc[date] = profit;
        } else {
            acc[date] += profit;
        }
        return acc;
    }, {});

    // Convert to arrays for the chart
    const dates = Object.keys(dailyProfits).sort((a, b) => new Date(a) - new Date(b));
    const profits = dates.map(date => dailyProfits[date]);
    
    // Calculate cumulative profits
    let runningTotal = 0;
    const cumulativeProfits = profits.map(profit => runningTotal += profit);

    // Create chart
    const ctx = document.getElementById('profitChart').getContext('2d');
    
    if (profitChart) {
        profitChart.destroy();
    }

    profitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Daily Profit',
                    data: profits,
                    borderColor: '#2196f3',
                    tension: 0.1,
                    fill: false,
                    order: 2
                },
                {
                    label: 'Cumulative Profit',
                    data: cumulativeProfits,
                    borderColor: '#4caf50',
                    tension: 0.1,
                    fill: false,
                    order: 1
                }
            ]
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
                    text: 'Profit Over Time',
                    color: '#ffffff',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 10,
                        usePointStyle: true,
                        font: {
                            size: 12
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
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: '#b3b3b3',
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10
                        },
                        maxTicksLimit: 8
                    },
                    grid: { color: '#333' }
                },
                y: {
                    ticks: { 
                        color: '#b3b3b3',
                        callback: value => formatCurrency(value),
                        font: {
                            size: 12
                        }
                    },
                    grid: { color: '#333' }
                }
            }
        }
    });
}

fetchBalances();

function createCalendar() {
    const container = document.querySelector('.calendar-container');
    const currentDate = new Date();
    
    function renderCalendarMonth(date, data) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // Calculate first day and days in month
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Calculate monthly total
        const monthlyTotal = Object.entries(data).reduce((total, [dateStr, dayData]) => {
            const [m] = dateStr.split('/');
            if (parseInt(m) === month + 1) {
                return total + dayData.profit;
            }
            return total;
        }, 0);
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        let calendarHTML = `
            <div class="calendar-header">
                <div class="calendar-navigation">
                    <button class="calendar-nav-btn prev-month">←</button>
                    <h2>${monthNames[month]} ${year}</h2>
                    <button class="calendar-nav-btn next-month">→</button>
                </div>
                <div class="month-total">Monthly Profit: ${formatCurrency(monthlyTotal)}</div>
            </div>
            <table class="calendar-table">
                <thead>
                    <tr>
                        <th class="calendar-th">Sun</th>
                        <th class="calendar-th">Mon</th>
                        <th class="calendar-th">Tue</th>
                        <th class="calendar-th">Wed</th>
                        <th class="calendar-th">Thu</th>
                        <th class="calendar-th">Fri</th>
                        <th class="calendar-th">Sat</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let day = 1;
        let calendarDays = '';
        
        for (let i = 0; i < 6; i++) {
            let row = '<tr>';
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDay) {
                    row += '<td class="calendar-day"></td>';
                } else if (day > daysInMonth) {
                    row += '<td class="calendar-day"></td>';
                } else {
                    const dateStr = `${month + 1}/${day}/${year.toString().slice(-2)}`;
                    const dayData = data[dateStr] || { profit: 0, bets: 0 };
                    const profitClass = dayData.profit > 0 ? 'profit-positive' : 
                                      dayData.profit < 0 ? 'profit-negative' : '';
                    
                    row += `
                        <td class="calendar-day">
                            <span class="day-number">${day}</span>
                            ${dayData.bets > 0 ? `
                                <div class="profit-cell">
                                    <span class="profit-amount ${profitClass}">
                                        ${formatCurrency(Math.round(dayData.profit)).split('.')[0]}
                                    </span>
                                    <span class="bet-count">
                                        ${dayData.bets} bet${dayData.bets !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            ` : ''}
                        </td>
                    `;
                    day++;
                }
            }
            row += '</tr>';
            calendarDays += row;
            if (day > daysInMonth) break;
        }
        
        calendarHTML += calendarDays + '</tbody></table>';
        container.innerHTML = calendarHTML;
        
        // Add event listeners for navigation
        container.querySelector('.prev-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendarMonth(currentDate, data);
        });
        
        container.querySelector('.next-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendarMonth(currentDate, data);
        });
    }

    // Process the bet data for calendar display
    function processDataForCalendar(rows) {
        const dailyData = {};
        
        rows.forEach(row => {
            const date = row[0];  // Date is in column 0
            const profit = parseFloat(row[6].replace(/[$,]/g, '')); // Profit is in column 6
            
            if (!dailyData[date]) {
                dailyData[date] = { profit: 0, bets: 0 };
            }
            
            dailyData[date].profit += profit;
            dailyData[date].bets += 1;
        });
        
        return dailyData;
    }

    // Update the fetch call to include calendar rendering
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEETS.BETS}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.values && data.values.length > 0) {
                const calendarData = processDataForCalendar(data.values.slice(1));
                renderCalendarMonth(currentDate, calendarData);
            }
        });
}

let wagerChart = null;

function createWagerChart(data) {
    const rows = data.slice(1); // Skip header row
    
    // Process daily wagers
    const dailyWagers = rows.reduce((acc, row) => {
        const date = row[0];
        const wager = parseFloat(row[4].replace(/[$,]/g, '')) || 0; // Wager is in column 4
        
        if (!acc[date]) {
            acc[date] = wager;
        } else {
            acc[date] += wager;
        }
        return acc;
    }, {});

    // Convert to arrays for the chart
    const dates = Object.keys(dailyWagers).sort((a, b) => new Date(a) - new Date(b));
    const wagers = dates.map(date => dailyWagers[date]);

    // Calculate cumulative wagers
    const cumulativeWagers = [];
    let runningTotal = 0;
    for (let wager of wagers) {
        runningTotal += wager;
        cumulativeWagers.push(runningTotal);
    }
    
    // Create chart
    const ctx = document.getElementById('wagerChart').getContext('2d');
    
    if (wagerChart) {
        wagerChart.destroy(); // Destroy the existing chart if it exists
    }
    
    wagerChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Daily Wagers',
                    data: wagers,
                    borderColor: '#ff9800', // Change color as needed
                    tension: 0.1,
                    fill: false,
                    order: 1
                },
                {
                    label: 'Cumulative Wagers',
                    data: cumulativeWagers,
                    borderColor: '#2196f3', // Change color as needed
                    tension: 0.1,
                    fill: false,
                    order: 2
                }
            ]
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
                    text: 'Wagers Over Time',
                    color: '#ffffff',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        padding: 10,
                        usePointStyle: true,
                        font: {
                            size: 12
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
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { 
                        color: '#b3b3b3',
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 10
                        },
                        maxTicksLimit: 8
                    },
                    grid: { color: '#333' }
                },
                y: {
                    ticks: { 
                        color: '#b3b3b3',
                        callback: value => formatCurrency(value),
                        font: {
                            size: 12
                        }
                    },
                    grid: { color: '#333' }
                }
            }
        }
    });
}

// Call this function in the appropriate place after fetching data
fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEETS.BETS}?key=${API_KEY}`)
    .then(response => response.json())
    .then(data => {
        if (data.values && data.values.length > 0) {
            displayData(data.values);
            createWagerChart(data.values); // Call the new chart function here
        }
    });

// Format Tab Functionality
function initializeFormatTab() {
    const inputData = document.getElementById('inputData');
    const outputData = document.getElementById('outputData');
    const processBtn = document.getElementById('processBtn');
    const copyBtn = document.getElementById('copyBtn');
    const summaryDiv = document.getElementById('summary');
    const tableContainer = document.getElementById('tableContainer');
    
    if (!inputData || !outputData || !processBtn || !copyBtn) {
        console.error('Format tab elements not found');
        return;
    }

    processBtn.addEventListener('click', processData);
    copyBtn.addEventListener('click', copyToClipboard);
    
    function processData() {
        const input = inputData.value.trim();
        if (!input) {
            alert('Please paste some data first!');
            return;
        }
        
        const lines = input.split('\n');
        const processedLines = [];
        const bets = [];
        
        console.log("Total lines to process:", lines.length);
        
        lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            const parts = line.split('\t');
            if (parts.length < 16) {
                console.log(`Line ${index + 1}: Not enough columns (${parts.length})`);
                return;
            }
            
            try {
                // Format date as MM/DD/YY instead of MM/DD/YYYY
                const fullDateStr = parts[0].split(',')[0];
                const dateComponents = fullDateStr.split('/');
                const dateStr = `${dateComponents[0]}/${dateComponents[1]}/${dateComponents[2].substring(2)}`;
                
                const bookmaker = parts[1];
                
                // Remove city names from team names
                const fullTeams = parts[4];
                const teamsArray = fullTeams.split(' vs ');
                
                // Filter out city names, keeping only the team name
                const simplifyTeamName = (team) => {
                    // Common team names to keep (without the city)
                    const teamNames = [
                        'Yankees', 'Orioles', 'Cubs', 'Pirates', 'Braves', 'Rockies', 
                        'Twins', 'Guardians', 'Bucks', 'Pacers', 'Angels', 'Mariners',
                        'Pistons', 'Knicks', 'Heat', 'Celtics', 'Lakers', 'Warriors'
                    ];
                    
                    // Find the team name in the full city+team string
                    for (const name of teamNames) {
                        if (team.includes(name)) {
                            return name;
                        }
                    }
                    
                    // If no match found, return the original
                    return team;
                };
                
                const team1 = simplifyTeamName(teamsArray[0]);
                const team2 = simplifyTeamName(teamsArray[1]);
                const teams = `${team1} vs ${team2}`;
                
                // Get bet type and details
                const betType = parts[7];
                const betDetailsFull = parts[8];
                
                console.log(`Line ${index + 1}:`, {
                    betType,
                    betDetailsFull
                });
                
                // Build the final bet description
                let betDescription;
                
                // First remove any odds at the beginning of bet details
                // The regex will match positive or negative numbers with optional decimals at the start
                // of the string, followed by at least one space
                const cleanBetDetails = betDetailsFull.replace(/^[-+]?\d+(\.\d+)?\s+/, '');
                
                console.log(`Line ${index + 1} cleaned:`, cleanBetDetails);
                
                // Now add the stat type to the end based on the bet type
                if (betType === "Player Blocks") {
                    betDescription = cleanBetDetails + " Blocks";
                } 
                else if (betType === "Player Points") {
                    betDescription = cleanBetDetails + " Points";
                }
                else if (betType === "Player Points + Rebounds + Assists") {
                    betDescription = cleanBetDetails + " PRAs";
                }
                else if (betType === "Player Strikeouts") {
                    betDescription = cleanBetDetails + " Strikeouts";
                }
                else if (betType === "Player Earned Runs") {
                    betDescription = cleanBetDetails + " Earned Runs";
                }
                else if (betType === "Player Runs") {
                    betDescription = cleanBetDetails + " Runs";
                }
                else if (betType === "Player Steals + Blocks") {
                    betDescription = cleanBetDetails + " Steals + Blocks";
                }
                else if (betType === "Player Singles") {
                    betDescription = cleanBetDetails + " Singles";
                }
                else if (betType === "Player Steals") {
                    betDescription = cleanBetDetails + " Steals";
                }
                else if (betType === "Player Rebounds") {
                    betDescription = cleanBetDetails + " Rebounds";
                }
                else if (betType === "Player Assists") {
                    betDescription = cleanBetDetails + " Assists";
                }
                else if (betType.startsWith("Player ")) {
                    // For any other Player stats we didn't specifically listed
                    const statType = betType.replace("Player ", "");
                    betDescription = cleanBetDetails + " " + statType;
                }
                else {
                    // Fallback - use complete bet type
                    betDescription = cleanBetDetails;
                }

                const wager = parseFloat(parts[12]);
                const result = parts[14]; // the result column
                let totalReturn = 0;
                
                // Check if the bet was won by looking at the profit value
                const profit = parseFloat(parts[16]) || 0;
                if (profit > 0) {
                    // For winning bets, return is wager + profit
                    totalReturn = wager + profit;
                }
                // For losing bets, totalReturn remains 0
                
                console.log(`Line ${index + 1} result:`, {
                    result,
                    profit,
                    totalReturn
                });
                
                const outputLine = `${dateStr}\t${teams}\t${betDescription}\t${bookmaker}\t$${wager.toFixed(2)}\t$${totalReturn.toFixed(2)}`;
                processedLines.push(outputLine);
                
                bets.push({
                    date: dateStr,
                    teams,
                    description: betDescription,
                    bookmaker,
                    wager,
                    totalReturn,
                    result,
                    profit
                });
            } catch (error) {
                console.error(`Error processing line ${index + 1}:`, line, error);
                console.error("Error details:", error);
                console.error("Parts:", parts);
            }
        });
        
        console.log("Processed lines:", processedLines.length);
        outputData.value = processedLines.join('\n');
        generateSummary(bets);
        generateTable(bets);
    }
    
    function generateSummary(bets) {
        const validBets = bets.filter(bet => !isNaN(bet.wager));
        
        const totalBets = validBets.length;
        const totalWagered = validBets.reduce((sum, bet) => sum + bet.wager, 0);
        const totalReturns = validBets.reduce((sum, bet) => sum + bet.totalReturn, 0);
        const profit = totalReturns - totalWagered;
        const wonBets = validBets.filter(bet => parseFloat(bet.profit) > 0).length;
        const pendingBets = validBets.filter(bet => bet.result === 'pending').length;
        const completedBets = totalBets - pendingBets;
        const lostBets = completedBets - wonBets;  // Calculate lost bets
        const winRate = completedBets > 0 ? ((wonBets / completedBets) * 100).toFixed(2) : 0;
        const roi = totalWagered > 0 ? ((profit / totalWagered) * 100).toFixed(2) : 0;
        
        const bookmakers = {};
        bets.forEach(bet => {
            if (!bookmakers[bet.bookmaker]) {
                bookmakers[bet.bookmaker] = {
                    count: 0,
                    wagered: 0,
                    returns: 0,
                    wonBets: 0,
                    lostBets: 0  // Track lost bets per bookmaker
                };
            }
            bookmakers[bet.bookmaker].count++;
            bookmakers[bet.bookmaker].wagered += bet.wager;
            bookmakers[bet.bookmaker].returns += bet.totalReturn;
            if (parseFloat(bet.profit) > 0) {
                bookmakers[bet.bookmaker].wonBets++;
            } else if (bet.result !== 'pending') {
                bookmakers[bet.bookmaker].lostBets++;  // Count lost bets
            }
        });
        
        let summaryHTML = `

            <div class="summary-content">
                <div class="summary-stats">
                    <h4>Overall Stats</h4>
                    <p><strong>Total Bets:</strong> ${totalBets}</p>
                    <p><strong>Record:</strong> ${wonBets}-${lostBets}</p>
                    <p><strong>Total Wagered:</strong> ${formatCurrency(totalWagered)}</p>
                    <p><strong>Total Returns:</strong> ${formatCurrency(totalReturns)}</p>
                    <p><strong>Profit/Loss:</strong> ${formatCurrency(profit)} (ROI: ${roi}%)</p>
                    <p><strong>Win Rate:</strong> ${winRate}%</p>
                    <p><strong>Pending Bets:</strong> ${pendingBets}</p>
                </div>
                
                <div class="bookmaker-breakdown">
                    <h4>Book Breakdown</h4>
                    <ul>
        `;
        
        for (const [bookmaker, data] of Object.entries(bookmakers)) {
            const bookmakerProfit = data.returns - data.wagered;
            summaryHTML += `
                <li><strong>${bookmaker}:</strong> ${data.wonBets}-${data.lostBets}, ${formatCurrency(data.wagered)} wagered, ${formatCurrency(bookmakerProfit)} profit</li>
            `;
        }
        
        summaryHTML += `
                    </ul>
                </div>
            </div>
        `;
        
        summaryDiv.innerHTML = summaryHTML;
    }
    
    function generateTable(bets) {
        const tableHTML = `
            <h3>Bet Details</h3>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Teams</th>
                        <th>Bet</th>
                        <th>Bookmaker</th>
                        <th>Wager</th>
                        <th>Return</th>
                        <th>Profit</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${bets.map(bet => {
                        const profit = bet.totalReturn - bet.wager;
                        const profitClass = profit > 0 ? 'positive' : profit < 0 ? 'negative' : '';
                        return `
                            <tr>
                                <td>${bet.date}</td>
                                <td>${bet.teams}</td>
                                <td>${bet.description}</td>
                                <td>${bet.bookmaker}</td>
                                <td>${formatCurrency(bet.wager)}</td>
                                <td>${formatCurrency(bet.totalReturn)}</td>
                                <td class="${profitClass}">${formatCurrency(profit)}</td>
                                <td>${bet.result}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = tableHTML;
    }
    
    function copyToClipboard() {
        outputData.select();
        document.execCommand('copy');
        alert('Copied to clipboard!');
    }
}

// Initialize format tab when document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeFormatTab();
});
