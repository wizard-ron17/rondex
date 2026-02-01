// Google Sheets API configuration
const API_KEY = 'AIzaSyAQiOsVDU8EPtSRTh2jioOOX1zymwt5UnI';
const SPREADSHEET_ID = '10W6lR7yZNxwaZLaUOMnhP1FwFLN2i6z0FNV0ANBnG1M';
const SHEETS = {
    BETS: 'Aaron!A1:Z1000',
    BALANCES: 'Balances!A1:Y1000',
    EV: 'EV!A1:Z8000'
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

// Global variables to store original data for filtering
let originalArbsData = null;
let originalEvData = null;

function displayData(values, filteredRows = null) {
    const headers = values[0];
    let rows = filteredRows || values.slice(1);

    // Only sort if not using filtered rows (filtered rows are already sorted)
    if (!filteredRows) {
        // Sort rows by date in descending order by default
        rows.sort((a, b) => {
            const dateA = parseDate(a[0]);
            const dateB = parseDate(b[0]);
            return dateB - dateA;
        });
    }
    
    let tableContent = '';
    rows.forEach((row, index) => {
        const league = row[1];
        const leagueKey = getLeagueKey(league);
        const [teamA, teamB] = splitTeams(row[2]);
        const teamAKey = getTeamKey(leagueKey, teamA);
        const teamBKey = getTeamKey(leagueKey, teamB);

        const leagueCell = (league === 'NFL')
            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg" alt="NFL" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'MLB')
            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Major_League_Baseball_logo.svg/640px-Major_League_Baseball_logo.svg.png" alt="MLB" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'NBA')
            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/thumb/0/03/National_Basketball_Association_logo.svg/800px-National_Basketball_Association_logo.svg.png" alt="NBA" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'NHL')
            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/3/3a/05_NHL_Shield.svg" alt="NHL" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'NCAAF')
            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/c/cf/NCAA_football_icon_logo.svg" alt="NCAAF" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'NPB')
            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/NPB_logo.svg/1200px-NPB_logo.svg.png" alt="NPB" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'WNBA')
            ? `<span class="league-cell"><img class="logo league" src="https://content.sportslogos.net/logos/16/1152/full/6613__wnba-alternate-2020.png" alt="WNBA" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'KBO')
            ? `<span class="league-cell"><img class="logo league" src="https://1000logos.net/wp-content/uploads/2021/05/KBO-League-Logo.png" alt="KBO" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'NCAAM')
            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball-men.svg" alt="NCAAM" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'NCAAB')
            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball-men.svg" alt="NCAAB" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'NCAAW')
            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball-women.svg" alt="NCAAW" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : (league === 'College Baseball')
            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/baseball.svg" alt="College Baseball" loading="lazy" onerror="this.style.display='none'"> ${league}</span>`
            : league;

        const hasTeams = teamA && teamB;
        const teamsCell = !hasTeams ? `<span>${row[2] || ''}</span>`
            : (league === 'NFL')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="NFL" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="NFL" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'MLB')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="MLB" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="MLB" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'NBA')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="NBA" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="NBA" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'NHL')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="NHL" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="NHL" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'NCAAF')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="NCAAF" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="NCAAF" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'WNBA')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="WNBA" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="WNBA" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'NCAAB')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="NCAAB" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="NCAAB" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'NCAAW')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="NCAAW" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="NCAAW" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : (league === 'College Baseball')
            ? `
                <div class="teams-cell">
                    <img class="logo team" data-league="College Baseball" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                    <span>${row[2]}</span>
                    <img class="logo team" data-league="College Baseball" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                </div>`
            : `<span>${row[2]}</span>`;

        tableContent += `
            <tr class="clickable" onclick="showBetModal(${JSON.stringify(row).replace(/"/g, '&quot;')})">
                <td>${row[0]}</td>
                <td>${row[4]}</td>
                <td>${row[6]}</td>
                <td class="profit ${parseFloat(row[7].replace(/[$,]/g, '')) > 0 ? 'positive' : ''}">${row[7]}</td>
                <td>${leagueCell}</td>
                <td>${teamsCell}</td>
                <td>${row[3]}</td>
            </tr>
        `;
    });
    
    document.getElementById('data').innerHTML = tableContent;
    const arbTbody = document.getElementById('data');
    if (arbTbody) hydrateLogosInContainer(arbTbody);
    calculateStats(rows);
    document.querySelector('.loading').style.display = 'none';
    
    // Update the date header to show it's sorted in descending order
    const dateHeader = document.querySelector('th[data-sort="date"]');
    dateHeader.classList.remove('asc');
}

function setupArbsFilters(allArbsRows) {
    originalArbsData = allArbsRows;

    // Get unique values for filters
    const allDates = allArbsRows.map(r => r[0]).filter(d => d).sort((a, b) => parseDate(b) - parseDate(a));
    const uniqueDates = [...new Set(allDates)];
    const uniqueSports = [...new Set(allArbsRows.map(r => (r[1] || '').trim()).filter(s => s))].sort();

    // Populate filter dropdowns
    const dateFilter = document.getElementById('arbs-dateRangeFilter');
    const sportFilter = document.getElementById('arbs-sportFilter');

    // Clear existing options (except "All")
    while (dateFilter.children.length > 1) dateFilter.removeChild(dateFilter.lastChild);
    while (sportFilter.children.length > 1) sportFilter.removeChild(sportFilter.lastChild);

    uniqueDates.forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.textContent = date;
        dateFilter.appendChild(opt);
    });

    uniqueSports.forEach(sport => {
        const opt = document.createElement('option');
        opt.value = sport;
        opt.textContent = sport;
        sportFilter.appendChild(opt);
    });

    // Show filter section
    document.getElementById('arbs-filterSection').style.display = 'block';

    // Add event listeners
    dateFilter.addEventListener('change', applyArbsFilters);
    sportFilter.addEventListener('change', applyArbsFilters);
    document.getElementById('arbs-clearFiltersBtn').addEventListener('click', () => {
        dateFilter.value = '';
        sportFilter.value = '';
        applyArbsFilters();
    });
}

function applyArbsFilters() {
    if (!originalArbsData) return;

    const dateFilter = document.getElementById('arbs-dateRangeFilter');
    const sportFilter = document.getElementById('arbs-sportFilter');
    const selectedDate = dateFilter ? dateFilter.value : '';
    const selectedSport = sportFilter ? sportFilter.value : '';

    // Filter rows
    let filteredRows = originalArbsData.filter(r => {
        const date = (r[0] || '').trim();
        const sport = (r[1] || '').trim();
        const dateMatch = !selectedDate || date === selectedDate;
        const sportMatch = !selectedSport || sport === selectedSport;
        return dateMatch && sportMatch;
    });

    // Sort by date descending
    filteredRows.sort((a, b) => parseDate(b[0]) - parseDate(a[0]));

    // Re-display with filtered data
    const values = [originalArbsData.length > 0 ? ['Date', 'Sport', 'Event', 'Title', 'Wager', 'Profit', 'ROI', 'League', 'Teams'] : [], ...filteredRows];
    displayData(values, filteredRows);
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
    if (balance < 200) return '#ffeb3b';  // Yellow
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
        13: 'mybookie',
        14: 'bet105',
        15: 'thrillzz',
        16: 'sportzino',
        17: '4cx',
        18: 'hardrock',
        19: 'bet365',
        20: 'xbet',
        21: 'busr',
        22: 'betnow',
        23: 'wagerattack',
        24: 'wagerhub'
    };

    let total = 0;

    // Update individual balances
    Object.entries(balanceMap).forEach(([index, id]) => {
        const balance = parseFloat(lastRow[index].replace(/[$,]/g, '')) || 0;
        const element = document.getElementById(`${id}-balance`);
        if (element) {
            element.textContent = formatCurrency(balance);
            element.style.color = getBalanceColor(balance);
            total += balance;
        }
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
        { name: 'MyBookie', index: 13, color: '#f99b2e' },
        { name: 'Bet105', index: 14, color: '#3083dc' },
        { name: 'Thrillzz', index: 15, color: '#d5ff10' },
        { name: 'Sportzino', index: 16, color: '#05033d' },
        { name: '4cx', index: 17, color: '#272d58' },
        { name: 'Hard Rock', index: 18, color: '#6b47f1' },
        { name: 'bet365', index: 19, color: '#1d7456' },
        { name: 'Xbet', index: 20, color: '#06dd0d' },
        { name: 'BUSR', index: 21, color: '#132594' },
        { name: 'BetNow', index: 22, color: '#f76500' },
        { name: 'WagerAttack', index: 23, color: '#e64241' },
        { name: 'WagerHub', index: 24, color: '#fde404' }
    ];

    // Create datasets for each sportsbook and total
    const datasets = sportsbooks.map(book => {
        let data;
        if (book.index === 'total') {
            // Calculate total balance for each date
            data = chartData.map(row => {
                let total = 0;
                for (let i = 1; i <= 24; i++) {
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
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                            size: 10
                        },
                        maxTicksLimit: 8,
                        callback: function(value, index, values) {
                            // Format date to be more readable
                            const dateStr = this.getLabelForValue(value);
                            if (dateStr) {
                                const date = new Date(dateStr);
                                return date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: '2-digit'
                                });
                            }
                            return '';
                        }
                    },
                    grid: { color: '#333' }
                },
                y: {
                    ticks: { 
                        color: '#b3b3b3',
                        callback: value => '$' + value.toLocaleString(),
                        font: {
                            size: 12
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
    const mobileTabs = document.querySelectorAll('.mobile-tab');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const currentTabName = document.getElementById('current-tab-name');
    
    // Function to switch tabs
    function switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to selected tab and content
        const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const selectedMobileTab = document.querySelector(`.mobile-tab[data-tab="${tabName}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        if (selectedMobileTab) {
            selectedMobileTab.classList.add('active');
        }
        document.getElementById(`${tabName}-content`).classList.add('active');
        
        // Update current tab name for mobile
        const tabNames = {
            'arbs': 'Arbs',
            'ev': 'EV',
            'edgezone': 'EdgeZone',
            'balances': 'Balances',
            'stats': 'Stats',
            'calendar': 'Calendar',
            'format': 'Format'
        };
        currentTabName.textContent = tabNames[tabName] || tabName;
        
        // Close mobile menu if open
        closeMobileMenu();
        
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
            // Fetch and render EV profit chart and stats
            fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEETS.EV)}?key=${API_KEY}`)
                .then(response => response.json())
                .then(data => {
                    if (data.values && data.values.length > 1) {
                        // Use all EV rows (entire sheet is EV now)
                        const rows = data.values.slice(1);
                        // --- EV Profit Chart ---
                        // Remove old chart if present
                        let oldEvChart = document.getElementById('ev-profit-chart-wrapper');
                        if (oldEvChart) oldEvChart.remove();
                        // Create wrapper and canvas
                        let statsContent = document.getElementById('stats-content');
                        let chartWrapper = document.createElement('div');
                        chartWrapper.className = 'chart-wrapper';
                        chartWrapper.id = 'ev-profit-chart-wrapper';
                        chartWrapper.innerHTML = '<canvas id="evProfitChart"></canvas>';
                        statsContent.appendChild(chartWrapper);
                        // Prepare data for chart
                        const dailyProfits = rows.reduce((acc, row) => {
                            const date = row[0];
                            const profit = parseFloat((row[8] || '').toString().replace(/[$,]/g, '')) || 0;
                            if (!acc[date]) acc[date] = profit;
                            else acc[date] += profit;
                            return acc;
                        }, {});
                        const dates = Object.keys(dailyProfits).sort((a, b) => new Date(a) - new Date(b));
                        const profits = dates.map(date => dailyProfits[date]);
                        let runningTotal = 0;
                        const cumulativeProfits = profits.map(profit => runningTotal += profit);
                        // Draw chart
                        const ctx = document.getElementById('evProfitChart').getContext('2d');
                        if (window.evProfitChart && typeof window.evProfitChart.destroy === 'function') {
                            window.evProfitChart.destroy();
                        }
                        window.evProfitChart = new Chart(ctx, {
                            type: 'line',
                            data: {
                                labels: dates,
                                datasets: [
                                    {
                                        label: 'EV Daily Profit',
                                        data: profits,
                                        borderColor: '#ff9800',
                                        tension: 0.1,
                                        fill: false,
                                        order: 2
                                    },
                                    {
                                        label: 'EV Cumulative Profit',
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
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'EV Profit Over Time',
                                        color: '#ffffff',
                                        font: { size: 16 }
                                    },
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            color: '#ffffff',
                                            padding: 10,
                                            usePointStyle: true,
                                            font: { size: 12 }
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
                                                if (label) label += ': ';
                                                if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);
                                                return label;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        ticks: { color: '#b3b3b3', maxRotation: 45, minRotation: 45, font: { size: 10 }, maxTicksLimit: 8 },
                                        grid: { color: '#333' }
                                    },
                                    y: {
                                        ticks: { color: '#b3b3b3', callback: value => formatCurrency(value), font: { size: 12 } },
                                        grid: { color: '#333' }
                                    }
                                }
                            }
                        });
                        // --- EV Stats Grid ---
                        let totalBets = rows.length;
                        let totalWagered = rows.reduce((sum, row) => sum + (parseFloat((row[5] || '').toString().replace(/[$,]/g, '')) || 0), 0);
                        let totalProfit = rows.reduce((sum, row) => sum + (parseFloat((row[8] || '').toString().replace(/[$,]/g, '')) || 0), 0);
                        let avgRoi = rows.length ? (rows.reduce((sum, row) => sum + (parseFloat((row[9] || '').toString().replace('%', '')) || 0), 0) / rows.length) : 0;
                        let wonBets = rows.filter(row => parseFloat((row[8] || '').toString().replace(/[$,]/g, '')) > 0).length;
                        let lostBets = rows.filter(row => parseFloat((row[8] || '').toString().replace(/[$,]/g, '')) < 0).length;
                        let winRate = totalBets ? ((wonBets / totalBets) * 100).toFixed(2) : 0;
                        let roi = totalWagered ? ((totalProfit / totalWagered) * 100).toFixed(2) : 0;
                        let evStatsHTML = `
                            <div class=\"stats-grid\" style=\"margin-top:2rem;\">
                                <div class=\"stat-card\"><div class=\"stat-label\">EV Bets</div><div class=\"stat-value\">${totalBets}</div></div>
                                <div class=\"stat-card\"><div class=\"stat-label\">Record</div><div class=\"stat-value\">${wonBets}-${lostBets}</div></div>
                                <div class=\"stat-card\"><div class=\"stat-label\">Total Wagered</div><div class=\"stat-value\">${formatCurrency(totalWagered)}</div></div>
                                <div class=\"stat-card\"><div class=\"stat-label\">Total Profit</div><div class=\"stat-value\">${formatCurrency(totalProfit)} <span class=\"profit-percentage\">(ROI: ${roi}%)</span></div></div>
                                <div class=\"stat-card\"><div class=\"stat-label\">Average ROI</div><div class=\"stat-value\">${avgRoi.toFixed(2)}%</div></div>
                                <div class=\"stat-card\"><div class=\"stat-label\">Win Rate</div><div class=\"stat-value\">${winRate}%</div></div>
                            </div>
                        `;
                        let oldEvStats = document.getElementById('ev-stats-grid');
                        if (oldEvStats) oldEvStats.remove();
                        let wrapper = document.createElement('div');
                        wrapper.id = 'ev-stats-grid';
                        wrapper.innerHTML = evStatsHTML;
                        statsContent.appendChild(wrapper);
                    }
                });
        } else if (tabName === 'ev') {
            const encodedRange = encodeURIComponent(SHEETS.EV);
            fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}?key=${API_KEY}`)
                .then(response => response.json())
                .then(data => {
                    if (data.values && data.values.length > 0) {
                        const rows = data.values.slice(1); // Skip header
                        renderEVTab(data.values);
                        setupEvFilters(rows); // Setup filtering with the data rows
                    }
                });
        } else if (tabName === 'edgezone') {
            // Fetch EdgeZone sheet and render
            fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent('EdgeZone!A1:Z5000')}?key=${API_KEY}`)
                .then(response => response.json())
                .then(data => {
                    if (data.values && data.values.length > 0) {
                        renderEdgeZoneTab(data.values);
                    } else {
                        document.getElementById('edgezone-summary').innerHTML = '<p>No data</p>';
                        document.getElementById('edgezone-tableContainer').innerHTML = '';
                    }
                })
                .catch(() => {
                    document.getElementById('edgezone-summary').innerHTML = '<p>Error loading EdgeZone data</p>';
                });
        }
    }
    
    // Mobile menu functions
    function openMobileMenu() {
        mobileMenu.classList.add('open');
        mobileMenuOverlay.classList.add('open');
        hamburgerBtn.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    function closeMobileMenu() {
        mobileMenu.classList.remove('open');
        mobileMenuOverlay.classList.remove('open');
        hamburgerBtn.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Hamburger button click handler
    hamburgerBtn.addEventListener('click', function() {
        if (mobileMenu.classList.contains('open')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });
    
    // Mobile tab click handlers
    mobileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            window.location.hash = tabName;
            switchTab(tabName);
        });
    });
    
    // Overlay click handler to close menu
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    
    // Keyboard escape handler to close menu
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && mobileMenu.classList.contains('open')) {
            closeMobileMenu();
        }
    });

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
        let raw = window.location.hash.slice(1);
        if (!raw) raw = 'arbs';
        // Support compound hash like "calendar&data=ev&month=2025-09"
        const [tabPart, ...params] = raw.split('&');
        const tabName = tabPart || 'arbs';
        const dataParam = params.find(p => /^data=/.test(p));
        const monthParam = params.find(p => /^month=/.test(p));
        
        if (dataParam) {
            const value = dataParam.split('=')[1];
            // pass desired source to calendar via global hint
            window.__calendarDesiredSource = (value || '').toLowerCase();
        }
        
        if (monthParam) {
            const monthValue = monthParam.split('=')[1];
            // pass desired month to calendar via global hint
            window.__calendarDesiredMonth = monthValue;
        }
        
        // Back-compat for old 'bets'
        const finalTab = (tabName === 'bets') ? 'arbs' : tabName;
        switchTab(finalTab);
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
    const dataSourceSelect = document.getElementById('calendar-data-source');
    const segmented = document.getElementById('calendar-segmented');
    const segmentButtons = segmented ? segmented.querySelectorAll('.calendar-segment') : [];
    
    // Initialize currentDate based on URL parameter or current date
    let currentDate = new Date();
    if (window.__calendarDesiredMonth) {
        const [year, month] = window.__calendarDesiredMonth.split('-');
        if (year && month) {
            currentDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        }
    }

    // Store all datasets
    let arbsData = null;
    let evData = null;
    let edgezoneData = null;

    // Helper function to update URL with current month
    function updateCalendarURL(date, dataSource) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;
        
        const parts = (window.location.hash.slice(1) || '').split('&');
        const tab = parts[0] || 'calendar';
        const dataParam = dataSource ? `&data=${dataSource}` : '';
        const monthParam = `&month=${monthStr}`;
        
        const newHash = `${tab}${dataParam}${monthParam}`;
        window.location.hash = newHash;
    }

    // Helper to process rows for calendar
    function processDataForCalendar(rows, isEdgeZone = false) {
        const dailyData = {};
        rows.forEach(row => {
            const [m, d, y] = row[0].split('/');
            const date = `${parseInt(m)}/${parseInt(d)}/${y.length === 4 ? y.slice(2) : y}`;
            let profitStr;
            if (isEdgeZone) {
                // EdgeZone: Profit $ is at index 9
                profitStr = row[9] || '0';
            } else {
                // Support both legacy (profit at index 6) and new EV (profit at index 8)
                profitStr = (row[8] && /[-$\d]/.test(row[8])) ? row[8] : row[6];
            }
            const profit = parseFloat((profitStr || '0').toString().replace(/[$,]/g, '')) || 0;
            if (!dailyData[date]) {
                dailyData[date] = { profit: 0, bets: 0 };
            }
            dailyData[date].profit += profit;
            dailyData[date].bets += 1;
        });
        return dailyData;
    }

    // Render calendar for selected data
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
        
        // Create header with navigation and total
        let calendarHTML = `
            <div class="calendar-header">
                <button class="calendar-nav-btn prev-month">←</button>
                <div class="calendar-title">${monthNames[month]} ${year}</div>
                <button class="calendar-nav-btn next-month">→</button>
            </div>
            <div class="calendar-total">Total profit: ${formatCurrency(monthlyTotal)}</div>
            <div class="calendar-grid">
        `;
        
        // Add day headers
        const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        dayHeaders.forEach(day => {
            calendarHTML += `<div class="calendar-day-header">${day}</div>`;
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${month + 1}/${day}/${year.toString().slice(-2)}`;
            const dayData = data[dateStr] || { profit: 0, bets: 0 };
            
            // Determine profit class and styling
            let profitClass = '';
            let profitDisplay = '';
            let betCountDisplay = '';
            
            if (dayData.bets > 0) {
                if (dayData.profit > 0) {
                    profitClass = 'profit-positive';
                    profitDisplay = formatCurrency(Math.round(dayData.profit)).split('.')[0];
                } else if (dayData.profit < 0) {
                    profitClass = 'profit-negative';
                    profitDisplay = formatCurrency(Math.round(dayData.profit)).split('.')[0];
                } else {
                    profitClass = 'profit-neutral';
                    profitDisplay = formatCurrency(Math.round(dayData.profit)).split('.')[0];
                }
                betCountDisplay = `${dayData.bets} bet${dayData.bets !== 1 ? 's' : ''}`;
            }
            
            calendarHTML += `
                <div class="calendar-day ${profitClass}">
                    <div class="day-number">${day}</div>
                    ${dayData.bets > 0 ? `
                        <div class="day-content">
                            <div class="profit-amount">${profitDisplay}</div>
                            <div class="bet-count">${betCountDisplay}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Add empty cells to fill the remaining grid spaces
        const totalCells = 7 * 6; // 7 days × 6 weeks
        const usedCells = firstDay + daysInMonth;
        for (let i = usedCells; i < totalCells; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        calendarHTML += '</div>';
        container.innerHTML = calendarHTML;
        
        // Add event listeners for navigation
        container.querySelector('.prev-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendarMonth(currentDate, data);
            // Get current data source for URL
            const selectedSources = getSelectedSources();
            const sourceParam = selectedSources.length > 0 ? selectedSources.join(',') : 'all';
            updateCalendarURL(currentDate, sourceParam);
        });
        
        container.querySelector('.next-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendarMonth(currentDate, data);
            // Get current data source for URL
            const selectedSources = getSelectedSources();
            const sourceParam = selectedSources.length > 0 ? selectedSources.join(',') : 'all';
            updateCalendarURL(currentDate, sourceParam);
        });
    }

    // Get selected sources from checkboxes
    function getSelectedSources() {
        const checkboxes = document.querySelectorAll('.calendar-checkboxes input[type="checkbox"][data-source]:not([data-source="all"])');
        const selected = [];
        checkboxes.forEach(cb => {
            if (cb.checked) selected.push(cb.getAttribute('data-source'));
        });
        return selected;
    }

    function updateCalendar() {
        const selectedSources = getSelectedSources();
        
        // Merge selected data sources
        const data = {};
        const allDates = new Set([
            ...Object.keys(arbsData || {}),
            ...Object.keys(evData || {}),
            ...Object.keys(edgezoneData || {})
        ]);
        
        allDates.forEach(date => {
            data[date] = { profit: 0, bets: 0 };
            if (selectedSources.includes('arbs') && arbsData && arbsData[date]) {
                data[date].profit += arbsData[date].profit;
                data[date].bets += arbsData[date].bets;
            }
            if (selectedSources.includes('ev') && evData && evData[date]) {
                data[date].profit += evData[date].profit;
                data[date].bets += evData[date].bets;
            }
            if (selectedSources.includes('edgezone') && edgezoneData && edgezoneData[date]) {
                data[date].profit += edgezoneData[date].profit;
                data[date].bets += edgezoneData[date].bets;
            }
        });
        
        renderCalendarMonth(currentDate, data);
        
        // Update URL with comma-separated sources
        const sourceParam = selectedSources.length > 0 ? selectedSources.join(',') : 'all';
        updateCalendarURL(currentDate, sourceParam);
    }

    // Setup checkbox handlers
    const allCheckbox = document.getElementById('calendar-checkbox-all');
    const arbsCheckbox = document.getElementById('calendar-checkbox-arbs');
    const evCheckbox = document.getElementById('calendar-checkbox-ev');
    const edgezoneCheckbox = document.getElementById('calendar-checkbox-edgezone');
    
    // "All" checkbox handler
    if (allCheckbox) {
        allCheckbox.addEventListener('change', () => {
            const isChecked = allCheckbox.checked;
            if (arbsCheckbox) arbsCheckbox.checked = isChecked;
            if (evCheckbox) evCheckbox.checked = isChecked;
            if (edgezoneCheckbox) edgezoneCheckbox.checked = isChecked;
            updateCalendar();
        });
    }
    
    // Individual checkbox handlers
    [arbsCheckbox, evCheckbox, edgezoneCheckbox].forEach(cb => {
        if (cb) {
            cb.addEventListener('change', () => {
                const selected = getSelectedSources();
                // If all are selected, check "All"; if any unchecked, uncheck "All"
                if (allCheckbox) {
                    allCheckbox.checked = selected.length === 3;
                }
                updateCalendar();
            });
        }
    });
    
    // Select fallback (hidden but kept for URL parsing)
    if (dataSourceSelect) {
        dataSourceSelect.addEventListener('change', () => {
            // Handle legacy single-select behavior
            const value = dataSourceSelect.value;
            if (value === 'all') {
                if (allCheckbox) allCheckbox.checked = true;
                if (arbsCheckbox) arbsCheckbox.checked = true;
                if (evCheckbox) evCheckbox.checked = true;
                if (edgezoneCheckbox) edgezoneCheckbox.checked = true;
            } else {
                if (allCheckbox) allCheckbox.checked = false;
                if (arbsCheckbox) arbsCheckbox.checked = value === 'arbs';
                if (evCheckbox) evCheckbox.checked = value === 'ev';
                if (edgezoneCheckbox) edgezoneCheckbox.checked = value === 'edgezone';
            }
            updateCalendar();
        });
    }

    // Fetch Arbs, EV, and EdgeZone data
    Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEETS.BETS}?key=${API_KEY}`)
            .then(response => response.json()),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEETS.EV)}?key=${API_KEY}`)
            .then(response => response.json()),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent('EdgeZone!A1:Z5000')}?key=${API_KEY}`)
            .then(response => response.json())
    ]).then(([arbs, ev, edgezone]) => {
        // Process Arbs data
        if (arbs.values && arbs.values.length > 1) {
            arbsData = processDataForCalendar(arbs.values.slice(1));
        } else {
            arbsData = {};
        }
        // Process EV data (entire sheet is EV now)
        if (ev.values && ev.values.length > 1) {
            const evRows = ev.values.slice(1);
            evData = processDataForCalendar(evRows);
        } else {
            evData = {};
        }
        // Process EdgeZone data
        if (edgezone.values && edgezone.values.length > 1) {
            const edgezoneRows = edgezone.values.slice(1);
            edgezoneData = processDataForCalendar(edgezoneRows, true);
        } else {
            edgezoneData = {};
        }
        
        // Handle URL parameters for sources
        if (window.__calendarDesiredSource) {
            const sources = window.__calendarDesiredSource.split(',').map(s => s.trim());
            // Set checkboxes based on URL param
            if (sources.includes('all') || sources.length === 0) {
                if (allCheckbox) allCheckbox.checked = true;
                if (arbsCheckbox) arbsCheckbox.checked = true;
                if (evCheckbox) evCheckbox.checked = true;
                if (edgezoneCheckbox) edgezoneCheckbox.checked = true;
            } else {
                if (allCheckbox) allCheckbox.checked = false;
                if (arbsCheckbox) arbsCheckbox.checked = sources.includes('arbs');
                if (evCheckbox) evCheckbox.checked = sources.includes('ev');
                if (edgezoneCheckbox) edgezoneCheckbox.checked = sources.includes('edgezone');
            }
        }
        
        // Set initial URL if not already set
        if (!window.__calendarDesiredMonth) {
            const selectedSources = getSelectedSources();
            const sourceParam = selectedSources.length > 0 ? selectedSources.join(',') : 'all';
            updateCalendarURL(currentDate, sourceParam);
        }
        
        updateCalendar();
    });
    
    // Handle window resize for mobile responsiveness
    window.addEventListener('resize', () => {
        if (document.getElementById('calendar-content').classList.contains('active')) {
            // Small delay to ensure layout has settled
            setTimeout(updateCalendar, 100);
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
            const rows = data.values.slice(1); // Skip header
            displayData(data.values);
            setupArbsFilters(rows); // Setup filtering with the data rows
            createWagerChart(data.values); // Call the new chart function here
        }
    });

// Format Tab Functionality
function initializeFormatTab() {
    const inputData = document.getElementById('inputData');
    const outputData = document.getElementById('outputData');
    const processBtn = document.getElementById('processBtn');
    const copyBtn = document.getElementById('copyBtn');
    const formatMode = document.getElementById('formatMode');
    const summaryDiv = document.getElementById('summary');
    const tableContainer = document.getElementById('tableContainer');
    const filterSection = document.getElementById('filterSection');
    const eventDateFilter = document.getElementById('eventDateFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const filterInfo = document.getElementById('filterInfo');
    
    if (!inputData || !outputData || !processBtn || !copyBtn) {
        console.error('Format tab elements not found');
        return;
    }

    // Store all processed bets and current filter state
    let allBets = [];
    let currentFilter = '';
    let eventDates = [];

    processBtn.addEventListener('click', processData);
    copyBtn.addEventListener('click', copyToClipboard);
    applyFilterBtn.addEventListener('click', applyFilter);
    clearFilterBtn.addEventListener('click', clearFilter);
    if (formatMode) {
        formatMode.addEventListener('change', applyCurrentFilter);
    }
    
    // Helper to parse date+time like '2026-01-25 5:18:20' (UTC) and convert to EST
    function parseDateTime(str) {
        // Parse the new format: '2026-01-25 5:18:20'
        const date = new Date(str + ' UTC');
        // Convert UTC to EST (UTC-5)
        date.setHours(date.getHours() - 5);
        return date;
    }

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
        
        // First pass: Group parlay legs by parlay ID
        const parlayGroups = {};
        const individualBets = [];
        
        lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            const parts = line.split('\t');
            if (parts.length < 16) {
                console.log(`Line ${index + 1}: Not enough columns (${parts.length})`);
                return;
            }
            
            const parlayId = parts[24] ? parts[24].trim() : ''; // Column 25 (0-indexed) is the parlay ID
            const betType = parts[15]; // Column 16 (0-indexed) is the bet type
            
            
            if (betType === 'parlay' && parlayId) {
                // This is a parlay leg
                if (!parlayGroups[parlayId]) {
                    parlayGroups[parlayId] = [];
                }
                parlayGroups[parlayId].push({ line, parts, index });
            } else {
                // This is an individual bet
                individualBets.push({ line, parts, index });
            }
        });
        
        // Process individual bets
        individualBets.forEach(({ line, parts, index }) => {
            try {
                const bet = processIndividualBet(parts, index);
                if (bet) {
                    bets.push(bet);
                }
            } catch (error) {
                console.error(`Error processing individual bet line ${index + 1}:`, line, error);
            }
        });
        
        // Process parlay groups
        Object.values(parlayGroups).forEach(parlayLegs => {
            try {
                const parlay = processParlay(parlayLegs);
                if (parlay) {
                    bets.push(parlay);
                }
            } catch (error) {
                console.error(`Error processing parlay:`, parlayLegs, error);
            }
        });
        
        console.log("Processed bets:", bets.length);
        console.log("Individual bets:", individualBets.length);
        console.log("Parlay groups:", Object.keys(parlayGroups).length);
        
        // Store all bets and extract unique event dates
        allBets = bets;
        eventDates = [...new Set(bets.map(bet => bet.eventDate))].sort();
        
        // Populate the filter dropdown
        populateEventDateFilter();
        
        // Show filter section
        filterSection.style.display = 'block';
        
        // Apply current filter or show all data
        applyCurrentFilter();
    }
    
    function processIndividualBet(parts, index) {
        // Format date as MM/DD/YY from new format '2026-01-25 5:18:20'
        // Parse the date, convert to EST, then format
        const betDateTime = parseDateTime(parts[0]);
        const month = String(betDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(betDateTime.getDate()).padStart(2, '0');
        const year = String(betDateTime.getFullYear()).slice(-2);
        const dateStr = `${month}/${day}/${year}`;
        
        const bookmaker = parts[1];
        
        // Remove city names from team names
        const fullTeams = parts[4] || '';
        const teamsArray = fullTeams ? fullTeams.split(' vs ') : ['', ''];
        
        // Filter out city names, keeping only the team name
        const simplifyTeamName = (team) => {
            if (!team || team.trim() === '') {
                return '';
            }
            
            // First approach: Check against known team names
            const teamNames = [
                'Yankees', 'Orioles', 'Cubs', 'Pirates', 'Braves', 'Rockies', 
                'Twins', 'Guardians', 'Bucks', 'Pacers', 'Angels', 'Mariners',
                'Pistons', 'Knicks', 'Heat', 'Celtics', 'Lakers', 'Warriors',
                'Timberwolves', 'Clippers', 'Nuggets', 'Kings', 'Suns', 'Blazers', 
                'Spurs', 'Thunder', 'Mavericks', 'Grizzlies', 'Pelicans', 'Nets', 
                'Hornets', 'Bulls', 'Cavaliers', '76ers', 'Magic', 'Wizards', 'Hawks',
                'Raptors', 'Rockets', 'Royals', 'Nationals', 'Blue Jays', 'Rays', 
                'Red Sox', 'Phillies', 'Mets', 'Marlins', 'Brewers', 'Reds', 
                'Cardinals', 'White Sox', 'Tigers', 'Guardians', 'Astros', 'Dodgers', 
                'Padres', 'Giants', 'Mariners', 'Rangers', 'Athletics', 'Diamondbacks',
                'Oilers', 'Flames', 'Canucks', 'Sharks', 'Knights', 'Kraken', 'Ducks',
                'Kings', 'Maple Leafs', 'Senators', 'Canadiens', 'Bruins', 'Lightning',
                'Panthers', 'Red Wings', 'Sabres', 'Jets', 'Wild', 'Blues', 'Predators', 
                'Blackhawks', 'Avalanche', 'Stars', 'Coyotes', 'Hurricanes', 'Capitals',
                'Islanders', 'Flyers', 'Devils', 'Rangers', 'Blue Jackets', 'Penguins',
                'Raiders', 'Chiefs', 'Broncos', 'Chargers', 'Seahawks', '49ers', 'Rams',
                'Cardinals', 'Vikings', 'Packers', 'Bears', 'Lions', 'Saints', 'Buccaneers',
                'Falcons', 'Panthers', 'Cowboys', 'Eagles', 'Commanders', 'Giants', 'Bills',
                'Dolphins', 'Patriots', 'Jets', 'Bengals', 'Ravens', 'Browns', 'Steelers',
                'Colts', 'Texans', 'Titans', 'Jaguars'
            ];
            
            // Try known team names first
            for (const name of teamNames) {
                if (team.includes(name)) {
                    return name;
                }
            }
            
            // Second approach: Handle the general case by splitting by spaces
            // Most city names are at the beginning (e.g., "New York Knicks", "Los Angeles Lakers")
            // Usually the last word is the team name
            const words = team.split(' ');
            
            // Some special cases - cities with two words
            const twoWordCities = ['New York', 'Los Angeles', 'San Francisco', 'San Diego', 'San Antonio', 
                                 'New Orleans', 'New Jersey', 'Las Vegas', 'St. Louis', 'Kansas City', 
                                 'Oklahoma City', 'Tampa Bay'];
            
            for (const city of twoWordCities) {
                if (team.startsWith(city)) {
                    // Return everything after the city name
                    return team.substring(city.length).trim();
                }
            }
            
            // If all else fails, just return the last word (usually the team name)
            if (words.length > 1) {
                return words[words.length - 1];
            }
            
            // If nothing else works, return the original
            return team;
        };
        
        const team1 = simplifyTeamName(teamsArray[0]);
        const team2 = simplifyTeamName(teamsArray[1]);
        const teams = (team1 && team2) ? `${team1} vs ${team2}` : (team1 || team2 || 'N/A');
        
        // Get bet type and details
        const betType = parts[7];
        const betDetailsFull = parts[8];
        
        // Build the final bet description and a base title (without market suffix)
        let betDescription;
        
        // First remove any odds at the beginning of bet details
        const cleanBetDetails = betDetailsFull.replace(/^[-+]?\d+(\.\d+)?\s+/, '');
        let betTitleBase = cleanBetDetails; // EdgeZone will use this (no stat suffix)
        
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

        // --- Live bet logic ---
        const betPlacedStr = parts[0]; // e.g. '04/28/2025, 16:12 EDT'
        const gameStartStr = parts[6]; // e.g. '04/28/2025, 22:00 EDT'
        const betPlaced = parseDateTime(betPlacedStr);
        const gameStart = parseDateTime(gameStartStr);
        if (betPlaced > gameStart) {
            betDescription += " Live";
            betTitleBase += " Live";
        }
        // --- End live bet logic ---

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
        
        // Extract league from column 4 (index 3)
        const league = parts[3] || 'N/A';
        
        // Extract odds from column 8 (index 7) - American odds
        const odds = parts[9] || 'N/A';
        
        // Extract event date from the second date/time (column 6) in new format
        const eventDateTime = parseDateTime(parts[6]);
        const eventMonth = String(eventDateTime.getMonth() + 1).padStart(2, '0');
        const eventDay = String(eventDateTime.getDate()).padStart(2, '0');
        const eventYear = String(eventDateTime.getFullYear()).slice(-2);
        const eventDateFormatted = `${eventMonth}/${eventDay}/${eventYear}`;
        
        return {
            date: dateStr,
            eventDate: eventDateFormatted,
            league,
            teams,
            description: betDescription,
            titleBase: betTitleBase,
            bookmaker,
            wager,
            totalReturn,
            result,
            profit,
            odds,
            isParlay: false,
            marketName: betType || 'N/A'
        };
    }
    
    function processParlay(parlayLegs) {
        if (parlayLegs.length === 0) return null;
        
        // Use the first leg for common data
        const firstLeg = parlayLegs[0];
        const parts = firstLeg.parts;
        
        // Format date as MM/DD/YY from new format '2026-01-25 5:18:20'
        const betDateTime = parseDateTime(parts[0]);
        const month = String(betDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(betDateTime.getDate()).padStart(2, '0');
        const year = String(betDateTime.getFullYear()).slice(-2);
        const dateStr = `${month}/${day}/${year}`;

        const bookmaker = parts[1];

        // Extract event date from the second date/time (column 6) in new format
        const eventDateTime = parseDateTime(parts[6]);
        const eventMonth = String(eventDateTime.getMonth() + 1).padStart(2, '0');
        const eventDay = String(eventDateTime.getDate()).padStart(2, '0');
        const eventYear = String(eventDateTime.getFullYear()).slice(-2);
        const eventDateFormatted = `${eventMonth}/${eventDay}/${eventYear}`;
        
        // Get unique leagues from all legs
        const leagues = [...new Set(parlayLegs.map(leg => leg.parts[3]).filter(league => league && league.trim()))];
        const leagueCount = leagues.length;
        
        // Determine league display
        let leagueDisplay;
        if (leagueCount > 1) {
            leagueDisplay = "Multiple";
        } else if (leagueCount === 1) {
            leagueDisplay = leagues[0];
        } else {
            leagueDisplay = "N/A";
        }
        
        // Process each leg to get descriptions
        const legDescriptions = parlayLegs.map(leg => {
            const legParts = leg.parts;
            const betType = legParts[7];
            const betDetailsFull = legParts[8];
            
            // Clean bet details
            const cleanBetDetails = betDetailsFull.replace(/^[-+]?\d+(\.\d+)?\s+/, '');
            
            // Build description based on bet type
            let description;
            if (betType === "Player Blocks") {
                description = cleanBetDetails + " Blocks";
            } 
            else if (betType === "Player Points") {
                description = cleanBetDetails + " Points";
            }
            else if (betType === "Player Points + Rebounds + Assists") {
                description = cleanBetDetails + " PRAs";
            }
            else if (betType === "Player Strikeouts") {
                description = cleanBetDetails + " Strikeouts";
            }
            else if (betType === "Player Earned Runs") {
                description = cleanBetDetails + " Earned Runs";
            }
            else if (betType === "Player Runs") {
                description = cleanBetDetails + " Runs";
            }
            else if (betType === "Player Steals + Blocks") {
                description = cleanBetDetails + " Steals + Blocks";
            }
            else if (betType === "Player Singles") {
                description = cleanBetDetails + " Singles";
            }
            else if (betType === "Player Steals") {
                description = cleanBetDetails + " Steals";
            }
            else if (betType === "Player Rebounds") {
                description = cleanBetDetails + " Rebounds";
            }
            else if (betType === "Player Assists") {
                description = cleanBetDetails + " Assists";
            }
            else if (betType.startsWith("Player ")) {
                const statType = betType.replace("Player ", "");
                description = cleanBetDetails + " " + statType;
            }
            else {
                description = cleanBetDetails;
            }
            
            // Check for live bet
            const betPlacedStr = legParts[0];
            const gameStartStr = legParts[6];
            const betPlaced = parseDateTime(betPlacedStr);
            const gameStart = parseDateTime(gameStartStr);
            if (betPlaced > gameStart) {
                description += " Live";
            }
            
            return description;
        });
        
        // Create combined description with commas
        const combinedDescription = legDescriptions.join(', ');
        
        // Create teams display in the format "X Leg [Sports] Parlay"
        const legCount = parlayLegs.length;
        let teamsDisplay;
        if (leagueCount > 1) {
            const sportsList = leagues.join(' & ');
            teamsDisplay = `${legCount} Leg ${sportsList} Parlay`;
        } else if (leagueCount === 1) {
            teamsDisplay = `${legCount} Leg ${leagues[0]} Parlay`;
        } else {
            teamsDisplay = `${legCount} Leg Parlay`;
        }
        
        // Get parlay totals from first leg
        const wager = parseFloat(parts[12]);
        const result = parts[14];
        const profit = parseFloat(parts[16]) || 0;
        let totalReturn = 0;
        
        if (profit > 0) {
            totalReturn = wager + profit;
        }
        
        // Get the combined odds from the first leg (this should be the parlay odds)
        const combinedOdds = parts[9] || 'N/A';
        
        return {
            date: dateStr,
            eventDate: eventDateFormatted,
            league: leagueDisplay,
            teams: teamsDisplay,
            description: combinedDescription,
            bookmaker,
            wager,
            totalReturn,
            result,
            profit,
            odds: combinedOdds,
            isParlay: true,
            marketName: 'Parlay',
            parlayLegs: parlayLegs.length
        };
    }
    
    function generateSummary(bets) {
        const validBets = bets.filter(bet => !isNaN(bet.wager));
        
        const totalBets = validBets.length;
        const totalWagered = validBets.reduce((sum, bet) => sum + bet.wager, 0);
        const totalReturns = validBets.reduce((sum, bet) => sum + bet.totalReturn, 0);
        const profit = totalReturns - totalWagered;
        const pendingBets = validBets.filter(bet => bet.result === 'pending').length;
        const refundedBets = validBets.filter(bet => bet.result === 'refunded').length;
        
        // Completed non-refunded bets
        const completedNonRefunded = validBets.filter(bet => bet.result !== 'pending' && bet.result !== 'refunded');
        const withDupWon = completedNonRefunded.filter(bet => parseFloat(bet.profit) > 0).length;
        const withDupLost = completedNonRefunded.length - withDupWon;
        
        // Deduplicate by exact Bet Title (description)
        const seenTitles = new Set();
        const uniqueCompleted = [];
        completedNonRefunded.forEach(bet => {
            const key = bet.description || '';
            if (!seenTitles.has(key)) {
                seenTitles.add(key);
                uniqueCompleted.push(bet);
            }
        });
        const uniqueWon = uniqueCompleted.filter(bet => parseFloat(bet.profit) > 0).length;
        const uniqueLost = uniqueCompleted.length - uniqueWon;
        
        // Primary (non-duplicate) record used for win rate
        const completedBets = uniqueCompleted.length;
        const wonBets = uniqueWon;
        const lostBets = uniqueLost;
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
            } else if (bet.result !== 'pending' && bet.result !== 'refunded') {
                bookmakers[bet.bookmaker].lostBets++;  // Count lost bets
            }
        });
        
        let summaryHTML = `

            <div class="summary-content">
                <div class="summary-stats">
                    <h4>Overall Stats</h4>
                    <p><strong>Total Bets:</strong> ${totalBets}</p>
                    <p><strong>Record:</strong> ${wonBets}-${lostBets} (${withDupWon}-${withDupLost} with duplicates)</p>
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
                        <th>League</th>
                        <th>Teams</th>
                        <th>Bet</th>
                        <th>Bookmaker</th>
                        <th>Wager</th>
                        <th>Return</th>
                        <th>Profit</th>
                        <th>Status</th>
                        <th>Odds</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${bets.map((bet, index) => {
                        const profit = bet.totalReturn - bet.wager;
                        const profitClass = profit > 0 ? 'positive' : profit < 0 ? 'negative' : '';
                        const typeDisplay = bet.isParlay ? `Parlay (${bet.parlayLegs} legs)` : 'Single';
                        const typeClass = bet.isParlay ? 'parlay-type' : 'single-type';
                        return `
                            <tr data-bet-index="${index}">
                                <td>${bet.date}</td>
                                <td>${bet.league}</td>
                                <td>${bet.teams}</td>
                                <td>${bet.description}</td>
                                <td>${bet.bookmaker}</td>
                                <td>${formatCurrency(bet.wager)}</td>
                                <td>${formatCurrency(bet.totalReturn)}</td>
                                <td class="${profitClass}">${formatCurrency(profit)}</td>
                                <td>${bet.result}</td>
                                <td>${bet.odds}</td>
                                <td class="${typeClass}">${typeDisplay}</td>
                                <td>
                                    <button class="delete-bet-btn" data-bet-index="${index}" title="Delete this bet">
                                        ×
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = tableHTML;
        
        // Add event listeners to delete buttons
        addDeleteButtonListeners(bets);
    }
    
    function copyToClipboard() {
        outputData.select();
        document.execCommand('copy');
        alert('Copied to clipboard!');
    }
    
    function populateEventDateFilter() {
        eventDateFilter.innerHTML = '<option value="">All Dates</option>';
        eventDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            eventDateFilter.appendChild(option);
        });
    }
    
    function applyFilter() {
        currentFilter = eventDateFilter.value;
        applyCurrentFilter();
    }
    
    function clearFilter() {
        currentFilter = '';
        eventDateFilter.value = '';
        applyCurrentFilter();
    }
    
    function applyCurrentFilter() {
        let filteredBets = allBets;
        
        if (currentFilter) {
            filteredBets = allBets.filter(bet => bet.eventDate === currentFilter);
        }
        
        // Generate output for filtered bets
        const mode = formatMode ? formatMode.value : 'standard';
        const processedLines = filteredBets.map(bet => {
            if (mode === 'edgezone') {
                // EdgeZone: insert Market Name column before Bet Title, and remove market suffix from Bet Title
                const title = bet.titleBase || bet.description;
                return `${bet.date}\t${bet.league}\t${bet.teams}\t${bet.marketName || 'N/A'}\t${title}\t${bet.bookmaker}\t$${bet.wager.toFixed(2)}\t$${bet.totalReturn.toFixed(2)}\t${bet.odds}`;
            } else {
                // Standard (existing)
                return `${bet.date}\t${bet.league}\t${bet.teams}\t${bet.description}\t${bet.bookmaker}\t$${bet.wager.toFixed(2)}\t$${bet.totalReturn.toFixed(2)}\t${bet.odds}`;
            }
        });
        
        outputData.value = processedLines.join('\n');
        generateSummary(filteredBets);
        generateTable(filteredBets);
        
        // Update filter info
        updateFilterInfo(filteredBets);
    }
    
    function updateFilterInfo(filteredBets) {
        const totalBets = allBets.length;
        const filteredCount = filteredBets.length;
        
        if (currentFilter) {
            filterInfo.textContent = `Showing ${filteredCount} of ${totalBets} bets for event date: ${currentFilter}`;
        } else {
            filterInfo.textContent = `Showing all ${totalBets} bets`;
        }
    }
    
    function addDeleteButtonListeners(bets) {
        const deleteButtons = document.querySelectorAll('.delete-bet-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const betIndex = parseInt(button.getAttribute('data-bet-index'));
                const bet = bets[betIndex];
                
                // Show confirmation dialog
                const confirmMessage = `Are you sure you want to delete this bet?\n\n${bet.teams} - ${bet.description}\n${bet.bookmaker} - $${bet.wager.toFixed(2)}`;
                
                if (confirm(confirmMessage)) {
                    deleteBet(betIndex, bet);
                }
            });
        });
    }
    
    function deleteBet(betIndex, bet) {
        // Find the actual index in allBets array
        const actualIndex = allBets.findIndex(b => 
            b.date === bet.date && 
            b.teams === bet.teams && 
            b.description === bet.description && 
            b.bookmaker === bet.bookmaker && 
            b.wager === bet.wager
        );
        
        if (actualIndex !== -1) {
            // Remove from allBets array
            allBets.splice(actualIndex, 1);
            
            // Update event dates if this was the last bet for that date
            const remainingEventDates = [...new Set(allBets.map(bet => bet.eventDate))].sort();
            if (JSON.stringify(remainingEventDates) !== JSON.stringify(eventDates)) {
                eventDates = remainingEventDates;
                populateEventDateFilter();
            }
            
            // Reapply current filter to update display
            applyCurrentFilter();
            
            console.log(`Deleted bet: ${bet.teams} - ${bet.description}`);
        }
    }
}

// Initialize format tab when document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeFormatTab();
});

// --- League & Team Logo Helpers ---
const LEAGUE_KEYS = { 'NFL': 'nfl', 'NBA': 'nba', 'NHL': 'nhl', 'MLB': 'mlb', 'NCAAF': 'ncaaf', 'CBB': 'cbb', 'CBB ': 'cbb', "CBB Men's": 'cbb', 'NPB': 'npb', 'WNBA': 'wnba', 'KBO': 'kbo', 'College Baseball': 'collegebaseball', 'NCAAB': 'ncaaf', 'NCAAW': 'ncaaf' };

// Start with NFL mapping; extend over time
const TEAM_KEYS = {
    nfl: {
        'Steelers': 'pit', 'Jets': 'nyj', 'Giants': 'nyg', 'Commanders': 'was', 'Broncos': 'den', 'Titans': 'ten',
        'Buccaneers': 'tb', 'Falcons': 'atl', 'Packers': 'gb', 'Bears': 'chi', 'Lions': 'det', 'Vikings': 'min',
        'Patriots': 'ne', 'Dolphins': 'mia', 'Bills': 'buf', 'Cowboys': 'dal', 'Eagles': 'phi', '49ers': 'sf',
        'Seahawks': 'sea', 'Rams': 'lar', 'Chargers': 'lac', 'Chiefs': 'kc', 'Raiders': 'lv', 'Ravens': 'bal',
        'Bengals': 'cin', 'Browns': 'cle', 'Steelers ': 'pit', 'Saints': 'no', 'Panthers': 'car', 'Jaguars': 'jac',
        'Texans': 'hou', 'Colts': 'ind', 'Cardinals': 'ari', 'Jets ': 'nyj'
    },
    mlb: {
        'Diamondbacks': 'ARI', 'Braves': 'ATL', 'Orioles': 'BAL', 'Red Sox': 'BOS', 'Cubs': 'CHC', 'White Sox': 'CWS',
        'Reds': 'CIN', 'Guardians': 'CLE', 'Rockies': 'COL', 'Tigers': 'DET', 'Astros': 'HOU', 'Royals': 'KC',
        'Angels': 'ANA', 'Dodgers': 'LA', 'Marlins': 'MIA', 'Brewers': 'MIL', 'Twins': 'MIN', 'Mets': 'NYM',
        'Yankees': 'NYY', 'Athletics': 'OAK', 'Phillies': 'PHI', 'Pirates': 'PIT', 'Padres': 'SD', 'Giants': 'SF',
        'Mariners': 'SEA', 'Cardinals': 'STL', 'Rays': 'TB', 'Rangers': 'TEX', 'Blue Jays': 'TOR', 'Nationals': 'WAS'
    }
};

// NFL team abbreviation map for React-NFL-Logos (uppercase official abbreviations)
const NFL_ABBREV = {
    'Cardinals': 'ARI', 'Falcons': 'ATL', 'Ravens': 'BAL', 'Bills': 'BUF', 'Panthers': 'CAR', 'Bears': 'CHI', 'Bengals': 'CIN', 'Browns': 'CLE',
    'Cowboys': 'DAL', 'Broncos': 'DEN', 'Lions': 'DET', 'Packers': 'GB', 'Texans': 'HOU', 'Colts': 'IND', 'Jaguars': 'JAC', 'Chiefs': 'KC',
    'Chargers': 'LAC', 'Rams': 'LAR', 'Raiders': 'LV', 'Dolphins': 'MIA', 'Vikings': 'MIN', 'Patriots': 'NE', 'Saints': 'NO', 'Giants': 'NYG',
    'Jets': 'NYJ', 'Eagles': 'PHI', 'Steelers': 'PIT', 'Seahawks': 'SEA', '49ers': 'SF', 'Buccaneers': 'TB', 'Titans': 'TEN', 'Commanders': 'WAS'
};

function getNflAbbrev(teamName) {
    const words = (teamName || '').trim().split(' ');
    const last = words[words.length - 1];
    return NFL_ABBREV[teamName] || NFL_ABBREV[last] || null;
}

// MLB team abbreviations for FantasyNerds image API
const MLB_ABBREV = {
    'Arizona Diamondbacks': 'ARI', 'Atlanta Braves': 'ATL', 'Baltimore Orioles': 'BAL', 'Boston Red Sox': 'BOS',
    'Chicago Cubs': 'CHC', 'Chicago White Sox': 'CHW', 'Cincinnati Reds': 'CIN', 'Cleveland Guardians': 'CLE',
    'Colorado Rockies': 'COL', 'Detroit Tigers': 'DET', 'Houston Astros': 'HOU', 'Kansas City Royals': 'KC',
    'Los Angeles Angels': 'ANA', 'Los Angeles Dodgers': 'LA', 'Miami Marlins': 'MIA', 'Milwaukee Brewers': 'MIL',
    'Minnesota Twins': 'MIN', 'New York Mets': 'NYM', 'New York Yankees': 'NYY', 'Oakland Athletics': 'OAK',
    'Philadelphia Phillies': 'PHI', 'Pittsburgh Pirates': 'PIT', 'San Diego Padres': 'SD', 'San Francisco Giants': 'SF',
    'Seattle Mariners': 'SEA', 'St Louis Cardinals': 'STL', 'Tampa Bay Rays': 'TB', 'Texas Rangers': 'TEX',
    'Toronto Blue Jays': 'TOR', 'Washington Nationals': 'WAS',
    // Single-word fallbacks
    'Diamondbacks': 'ARI', 'Braves': 'ATL', 'Orioles': 'BAL', 'Red Sox': 'BOS', 'Cubs': 'CHC', 'White Sox': 'CHW',
    'Reds': 'CIN', 'Guardians': 'CLE', 'Rockies': 'COL', 'Tigers': 'DET', 'Astros': 'HOU', 'Royals': 'KC',
    'Angels': 'ANA', 'Dodgers': 'LA', 'Marlins': 'MIA', 'Brewers': 'MIL', 'Twins': 'MIN', 'Mets': 'NYM',
    'Yankees': 'NYY', 'Athletics': 'OAK', 'Phillies': 'PHI', 'Pirates': 'PIT', 'Padres': 'SD', 'Giants': 'SF',
    'Mariners': 'SEA', 'Cardinals': 'STL', 'Rays': 'TB', 'Rangers': 'TEX', 'Blue Jays': 'TOR', 'Nationals': 'WAS'
};

function getMlbAbbrev(teamName) {
    const words = (teamName || '').trim().split(' ');
    const last = words[words.length - 1];
    return MLB_ABBREV[teamName] || MLB_ABBREV[last] || null;
}

function mlbPrimaryLogoUrl(abbrev) {
    // FantasyNerds MLB logos (medium size)
    return `https://www.fantasynerds.com/images/mlb/teams/large/${abbrev}.png`;
}

// NBA team abbreviations (FantasyNerds uses these codes)
const NBA_ABBREV = {
    'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN', 'Charlotte Hornets': 'CHA',
    'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE', 'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN',
    'Detroit Pistons': 'DET', 'Golden State Warriors': 'GS', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
    'Los Angeles Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM', 'Miami Heat': 'MIA',
    'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN', 'New Orleans Pelicans': 'NO', 'New York Knicks': 'NY',
    'Oklahoma City Thunder': 'OKC', 'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHO',
    'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SA', 'Toronto Raptors': 'TOR',
    'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
    // Single-word fallbacks
    'Hawks': 'ATL', 'Celtics': 'BOS', 'Nets': 'BKN', 'Hornets': 'CHA', 'Bulls': 'CHI', 'Cavaliers': 'CLE',
    'Mavericks': 'DAL', 'Nuggets': 'DEN', 'Pistons': 'DET', 'Warriors': 'GS', 'Rockets': 'HOU', 'Pacers': 'IND',
    'Clippers': 'LAC', 'Lakers': 'LAL', 'Grizzlies': 'MEM', 'Heat': 'MIA', 'Bucks': 'MIL', 'Timberwolves': 'MIN',
    'Pelicans': 'NO', 'Knicks': 'NY', 'Thunder': 'OKC', 'Magic': 'ORL', '76ers': 'PHI', 'Suns': 'PHO',
    'Trail Blazers': 'POR', 'Blazers': 'POR', 'Kings': 'SAC', 'Spurs': 'SA', 'Raptors': 'TOR', 'Jazz': 'UTA',
    'Wizards': 'WAS'
};

// WNBA team abbreviations (ESPN format)
const WNBA_ABBREV = {
    'Atlanta Dream': 'atl', 'Chicago Sky': 'chi', 'Connecticut Sun': 'conn', 'Dallas Wings': 'dal',
    'Golden State Valkyries': 'gs', 'Indiana Fever': 'ind', 'Las Vegas Aces': 'lv', 'Los Angeles Sparks': 'la',
    'Minnesota Lynx': 'min', 'New York Liberty': 'ny', 'Phoenix Mercury': 'phx', 'Seattle Storm': 'sea',
    'Washington Mystics': 'was',
    // Single-word fallbacks
    'Dream': 'atl', 'Sky': 'chi', 'Sun': 'conn', 'Wings': 'dal', 'Valkyries': 'gs', 'Fever': 'ind', 'Aces': 'lv',
    'Sparks': 'la', 'Lynx': 'min', 'Liberty': 'ny', 'Mercury': 'phx', 'Storm': 'sea', 'Mystics': 'was'
};

// NHL team abbreviations (FantasyNerds format)
const NHL_ABBREV = {
    'Anaheim Ducks': 'ana', 'Utah Mammoth': 'uta', 'Boston Bruins': 'bos', 'Buffalo Sabres': 'buf',
    'Calgary Flames': 'cgy', 'Carolina Hurricanes': 'car', 'Chicago Blackhawks': 'chi', 'Colorado Avalanche': 'col',
    'Columbus Blue Jackets': 'cbj', 'Dallas Stars': 'dal', 'Detroit Red Wings': 'det', 'Edmonton Oilers': 'edm',
    'Florida Panthers': 'fla', 'Los Angeles Kings': 'la', 'Minnesota Wild': 'min', 'Montreal Canadiens': 'mtl',
    'Nashville Predators': 'nsh', 'New Jersey Devils': 'njd', 'New York Islanders': 'nyi', 'New York Rangers': 'nyr',
    'Ottawa Senators': 'ott', 'Philadelphia Flyers': 'phi', 'Pittsburgh Penguins': 'pit', 'San Jose Sharks': 'sjs',
    'Seattle Kraken': 'sea', 'St. Louis Blues': 'stl', 'Tampa Bay Lightning': 'tbl', 'Toronto Maple Leafs': 'tor',
    'Vancouver Canucks': 'van', 'Vegas Golden Knights': 'vgk', 'Washington Capitals': 'wsh', 'Winnipeg Jets': 'wpg',
    // Single-word fallbacks
    'Ducks': 'ana', 'Mammoth': 'uta', 'Bruins': 'bos', 'Sabres': 'buf', 'Flames': 'cgy', 'Hurricanes': 'car',
    'Blackhawks': 'chi', 'Avalanche': 'col', 'Jackets': 'cbj', 'Stars': 'dal', 'Wings': 'det', 'Oilers': 'edm',
    'Panthers': 'fla', 'Kings': 'la', 'Wild': 'min', 'Canadiens': 'mtl', 'Predators': 'nsh', 'Devils': 'njd',
    'Islanders': 'nyi', 'Rangers': 'nyr', 'Senators': 'ott', 'Flyers': 'phi', 'Penguins': 'pit', 'Sharks': 'sjs',
    'Kraken': 'sea', 'Blues': 'stl', 'Lightning': 'tbl', 'Maple Leafs': 'tor', 'Leafs': 'tor', 'Canucks': 'van',
    'Golden Knights': 'vgk', 'Capitals': 'wsh', 'Jets': 'wpg'
};

function getNbaAbbrev(teamName) {
    const words = (teamName || '').trim().split(' ');
    const last = words[words.length - 1];
    return NBA_ABBREV[teamName] || NBA_ABBREV[last] || null;
}

function nbaPrimaryLogoUrl(abbrev) {
    return `https://www.fantasynerds.com/images/nba/teams_large/${abbrev}.png`;
}

function getWnbaAbbrev(teamName) {
    const words = (teamName || '').trim().split(' ');
    const last = words[words.length - 1];
    return WNBA_ABBREV[teamName] || WNBA_ABBREV[last] || null;
}

function wnbaPrimaryLogoUrl(abbrev) {
    return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/wnba/500/${abbrev}.png`;
}

function getNhlAbbrev(teamName) {
    const words = (teamName || '').trim().split(' ');
    const last = words[words.length - 1];
    return NHL_ABBREV[teamName] || NHL_ABBREV[last] || null;
}

function nhlPrimaryLogoUrl(abbrev) {
    return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nhl/500/${abbrev}.png`;
}

// NCAAF team mapping to ESPN IDs (based on GitHub gist data)
const NCAAF_TEAM_IDS = {
    // Major Power 5 teams
    'Alabama': '333', 'Auburn': '2', 'LSU': '99', 'Georgia': '61', 'Florida': '57', 'Tennessee': '2633',
    'Texas A&M': '245', 'Ole Miss': '145', 'Mississippi State': '344', 'Arkansas': '8', 'Missouri': '142',
    'Kentucky': '96', 'South Carolina': '2579', 'Vanderbilt': '238',
    
    'Ohio State': '194', 'Michigan': '130', 'Penn State': '213', 'Michigan State': '127', 'Iowa': '2294',
    'Wisconsin': '275', 'Nebraska': '158', 'Minnesota': '135', 'Illinois': '356', 'Northwestern': '77',
    'Purdue': '2509', 'Indiana': '84', 'Maryland': '120', 'Rutgers': '164',
    
    'Oklahoma': '201', 'Texas': '251', 'Oklahoma State': '197', 'TCU': '2628', 'Baylor': '239',
    'Texas Tech': '2641', 'Kansas State': '2306', 'Iowa State': '66', 'Kansas': '2305', 'West Virginia': '277',
    'BYU': '252', 'Cincinnati': '2132', 'Houston': '248', 'UCF': '2116',
    
    'USC': '30', 'UCLA': '26', 'Oregon': '2483', 'Washington': '264', 'Utah': '254',
    'Stanford': '24', 'California': '25', 'Arizona State': '9', 'Arizona': '12',
    'Colorado': '38', 'Oregon State': '204', 'Washington State': '265',
    
    'Clemson': '228', 'Florida State': '52', 'Miami': '2390', 'North Carolina': '153',
    'Virginia Tech': '259', 'Pittsburgh': '221', 'Louisville': '97', 'NC State': '152',
    'Wake Forest': '154', 'Duke': '150', 'Virginia': '258', 'Georgia Tech': '59',
    'Boston College': '103', 'Syracuse': '183',
    
    // Other notable teams
    'Notre Dame': '87', 'Army': '349', 'Navy': '2426', 'Air Force': '2005',
    'Boise State': '68', 'San Diego State': '21', 'Fresno State': '278',
    'Utah State': '328', 'Wyoming': '2751', 'Colorado State': '36',
    'Memphis': '235', 'SMU': '2567', 'Tulane': '2655', 'Tulsa': '202',
    'Appalachian State': '2026', 'Coastal Carolina': '324', 'Georgia Southern': '290',
    'Marshall': '276', 'Old Dominion': '295', 'James Madison': '256',
    'Liberty': '2335', 'Western Kentucky': '98', 'Middle Tennessee': '2393',
    'Florida Atlantic': '2226', 'Florida International': '2229', 'Charlotte': '2429',
    'UAB': '5', 'UTSA': '2636', 'North Texas': '249', 'Rice': '242',
    'Troy': '2653', 'South Alabama': '6', 'Georgia State': '2247',
    'Louisiana': '309', 'Louisiana-Monroe': '2433', 'Arkansas State': '2032',
    'Arkansas Little Rock': '2031', 'Texas State': '326', 'Southern Miss': '2572',
    'Rider': '2520', 'Cal State Northridge': '2463', 'SC Upstate': '2908',
    'UAlbany': '399', 'Santa Clara': '2541', 'Xavier': '2752', 'Mount St Marys': '116',
    'St Peters': '2612', 'Creighton': '156', 'DePaul': '305', 'California': '25',
    'Cal': '25', 'UC Berkeley': '25', 'California Golden Bears': '25'
};

function getNcaafTeamId(teamName) {
    // Try exact match first, then last word heuristic
    const words = (teamName || '').trim().split(' ');
    const last = words[words.length - 1];
    return NCAAF_TEAM_IDS[teamName] || NCAAF_TEAM_IDS[last] || null;
}

function ncaafPrimaryLogoUrl(teamId) {
    // ESPN CDN format with optimized parameters for better loading
    return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${teamId}.png&w=80&h=80&cquality=40&scale=crop`;
}

function nflPrimaryLogoUrl(abbrev) {
    // FantasyNerds PNG (fast, no key)
    return `https://www.fantasynerds.com/images/nfl/team_logos/${abbrev}.png`;
}

// --- Dynamic NCAAF resolver using GitHub gist CSV (improves coverage beyond hardcoded map) ---
const NCAAF_GIST_CSV_URL = 'https://gist.githubusercontent.com/saiemgilani/c6596f0e1c8b148daabc2b7f1e6f6add/raw';
let ncaafIndex = null; // { bySchool, byAbbrev, byAlt, byMascot }
// Explicit overrides for tricky names
const NCAAF_OVERRIDES = {
    'st thomas': '2900',
    'saint thomas': '2900'
};

function normalizeSchoolName(value) {
    return (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+university$/i, '')
        .replace(/^university\s+of\s+/i, '')
        .replace(/\s*\(.*?\)\s*/g, '') // remove parentheticals e.g., Miami (FL)
        .replace(/\./g, '')
        .replace(/\s+/g, ' ');
}

async function loadNcaafIndex() {
    if (ncaafIndex) return ncaafIndex;
    try {
        const resp = await fetch(NCAAF_GIST_CSV_URL, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Failed to fetch NCAAF gist CSV');
        const text = await resp.text();
        const lines = text.split(/\r?\n/);
        // Header line example: id,school,mascot,abbreviation,alt_name1,alt_name2,alt_name3,conference,division,color,alt_color,logo,logos[1]
        const bySchool = {}; // normalized school -> id
        const byAbbrev = {}; // abbreviation -> id
        const byAlt = {};    // normalized alt -> id
        const byMascot = {}; // normalized mascot -> id
        for (let i = 1; i < lines.length; i++) {
            let row = lines[i];
            if (!row || !row.includes(',')) continue;
            // Strip markdown table pipes if present
            row = row.replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, '');
            // Split on commas, then trim
            const cols = row.split(',').map(s => s.trim());
            if (cols.length < 12) continue;
            let id = cols[0];
            const school = cols[1];
            const mascot = cols[2];
            const abbreviation = cols[3];
            const alt1 = cols[4];
            const alt2 = cols[5];
            const alt3 = cols[6];
            const logoUrl = cols[11] || '';
            // Prefer extracting numeric ID from logo URL for correctness
            const m = logoUrl.match(/\/ncaa\/500\/(\d+)\.png/i);
            if (m) id = m[1];
            const normSchool = normalizeSchoolName(school);
            if (id && normSchool) bySchool[normSchool] = id;
            if (abbreviation) byAbbrev[abbreviation.trim().toUpperCase()] = id;
            if (alt1) byAlt[normalizeSchoolName(alt1)] = id;
            if (alt2) byAlt[normalizeSchoolName(alt2)] = id;
            if (alt3) byAlt[normalizeSchoolName(alt3)] = id;
            if (mascot) byMascot[normalizeSchoolName(mascot)] = id;
        }
        ncaafIndex = { bySchool, byAbbrev, byAlt, byMascot };
        return ncaafIndex;
    } catch (e) {
        // If fetch fails, leave index null; we'll fall back to hardcoded map
        return null;
    }
}

async function getNcaafTeamIdAsync(teamName) {
    // Try dynamic index first, then fallback to hardcoded IDs
    const name = (teamName || '').toString().trim();
    const norm = normalizeSchoolName(name);
    if (NCAAF_OVERRIDES[norm]) return NCAAF_OVERRIDES[norm];
    // Handle common suffixes
    const lastWord = norm.split(' ').pop();
    const idx = await loadNcaafIndex();
    if (idx) {
        // Exact by school
        if (idx.bySchool[norm]) return idx.bySchool[norm];
        // By alt name
        if (idx.byAlt[norm]) return idx.byAlt[norm];
        // Heuristic: last word (e.g., Tigers, Gators)
        if (idx.byMascot[lastWord]) return idx.byMascot[lastWord];
        // If teamName provided as abbreviation directly
        const upper = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (idx.byAbbrev[upper]) return idx.byAbbrev[upper];
        // Try removing trailing state words ("state")
        if (norm.endsWith(' state')) {
            const base = norm.replace(/\s+state$/, '');
            if (idx.bySchool[base]) return idx.bySchool[base];
        }
    }
    // Fallback to partial hardcoded map
    const fallback = getNcaafTeamId(name) || getNcaafTeamId(lastWord);
    return fallback || null;
}

function nflSecondaryLogoUrl(abbrev) {
    // React-NFL-Logos SVGs via jsDelivr CDN as fallback
    return `https://cdn.jsdelivr.net/npm/react-nfl-logos@latest/src/svg/${abbrev}.svg`;
}

function getLeagueKey(leagueCell) {
    const raw = (leagueCell || '').toString().trim().toUpperCase();
    // Keep canonical like NFL, NBA, etc. Return lowercase key for paths
    const key = LEAGUE_KEYS[raw] ? LEAGUE_KEYS[raw] : raw.toLowerCase();
    return key;
}

function splitTeams(eventCell) {
    const parts = (eventCell || '').split(' vs ').map(s => s.trim());
    if (parts.length === 2) return parts;
    // Handle 'Team at Team' format as fallback
    const atParts = (eventCell || '').split(' at ').map(s => s.trim());
    if (atParts.length === 2) return atParts;
    return [parts[0] || '', ''];
}

function getTeamKey(leagueKey, teamName) {
    const map = TEAM_KEYS[leagueKey] || {};
    // Try exact, then last word heurstic (to handle city prefixes)
    if (map[teamName]) return map[teamName];
    const words = (teamName || '').split(' ');
    const last = words[words.length - 1];
    if (map[last]) return map[last];
    return null;
}

function leagueLogoUrl(leagueKey) {
    return `assets/leagues/${leagueKey}.png`;
}

function teamLogoUrl(leagueKey, teamKey) {
    return `assets/teams/${leagueKey}/${teamKey}.png`;
}

// Zero-maintenance logo lookup via Wikipedia thumbnails (focus NFL)
const LOGO_CACHE_KEY = 'logoCacheV1';
let logoCache = {};
try {
    logoCache = JSON.parse(localStorage.getItem(LOGO_CACHE_KEY) || '{}');
} catch (e) { logoCache = {}; }

function saveLogoCache() {
    try { localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(logoCache)); } catch (e) {}
}

async function fetchWikipediaThumb(query) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=64&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.query || !data.query.pages) return null;
    const pages = Object.values(data.query.pages);
    if (pages.length && pages[0].thumbnail && pages[0].thumbnail.source) {
        return pages[0].thumbnail.source;
    }
    return null;
}

async function resolveNflTeamLogo(teamName) {
    const key = `nfl:${teamName}`;
    if (logoCache[key]) return logoCache[key];
    // Try a few query patterns
    const queries = [
        `${teamName} NFL logo`,
        `${teamName} (NFL) logo`,
        `${teamName} football logo`
    ];
    for (const q of queries) {
        try {
            const url = await fetchWikipediaThumb(q);
            if (url) { logoCache[key] = url; saveLogoCache(); return url; }
        } catch (e) { /* ignore and try next */ }
    }
    // No result; remember miss to avoid repeated fetches
    logoCache[key] = null; saveLogoCache();
    return null;
}

async function resolveNflLeagueLogo() {
    const key = 'league:nfl';
    if (logoCache[key]) return logoCache[key];
    // Provided NFL shield SVG on Wikimedia
    const url = 'https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg';
    logoCache[key] = url; saveLogoCache();
    return url;
}

function hydrateLogosInContainer(container) {
    // League logos - no hydration needed when src is already set inline
    // NFL Team logos (FantasyNerds only; no fallbacks)
    container.querySelectorAll('img.logo.team[data-league="NFL"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const abbr = getNflAbbrev(team);
        if (abbr) {
            img.onerror = function() { this.style.display = 'none'; };
            img.setAttribute('src', nflPrimaryLogoUrl(abbr));
        } else {
            img.style.display = 'none';
        }
    });

    // MLB team logos via FantasyNerds
    container.querySelectorAll('img.logo.team[data-league="MLB"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const abbr = getMlbAbbrev(team);
        if (abbr) {
            img.setAttribute('src', mlbPrimaryLogoUrl(abbr));
        }
    });

    // NBA team logos via FantasyNerds
    container.querySelectorAll('img.logo.team[data-league="NBA"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const abbr = getNbaAbbrev(team);
        if (abbr) {
            img.setAttribute('src', nbaPrimaryLogoUrl(abbr));
        }
    });

    // NHL team logos via FantasyNerds
    container.querySelectorAll('img.logo.team[data-league="NHL"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const abbr = getNhlAbbrev(team);
        if (abbr) {
            img.setAttribute('src', nhlPrimaryLogoUrl(abbr));
        }
    });

    // NCAAF team logos via ESPN CDN (async index-backed)
    container.querySelectorAll('img.logo.team[data-league="NCAAF"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const teamId = await getNcaafTeamIdAsync(team);
        if (teamId) {
            img.onerror = function() { this.style.display = 'none'; };
            img.setAttribute('src', ncaafPrimaryLogoUrl(teamId));
        } else {
            img.style.display = 'none';
        }
    });

    // WNBA team logos via ESPN CDN
    container.querySelectorAll('img.logo.team[data-league="WNBA"][data-team]').forEach(img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const abbr = getWnbaAbbrev(team);
        if (abbr) {
            img.onerror = function() { this.style.display = 'none'; };
            img.setAttribute('src', wnbaPrimaryLogoUrl(abbr));
        } else {
            img.style.display = 'none';
        }
    });

    // NCAAB team logos via ESPN CDN (same as NCAAF)
    container.querySelectorAll('img.logo.team[data-league="NCAAB"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const teamId = await getNcaafTeamIdAsync(team);
        if (teamId) {
            img.onerror = function() { this.style.display = 'none'; };
            img.setAttribute('src', ncaafPrimaryLogoUrl(teamId));
        } else {
            img.style.display = 'none';
        }
    });

    // NCAAW team logos via ESPN CDN (same as NCAAF)
    container.querySelectorAll('img.logo.team[data-league="NCAAW"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const teamId = await getNcaafTeamIdAsync(team);
        if (teamId) {
            img.onerror = function() { this.style.display = 'none'; };
            img.setAttribute('src', ncaafPrimaryLogoUrl(teamId));
        } else {
            img.style.display = 'none';
        }
    });

    // College Baseball team logos via ESPN CDN (same as NCAAF)
    container.querySelectorAll('img.logo.team[data-league="College Baseball"][data-team]').forEach(async img => {
        if (img.getAttribute('src')) return;
        const team = img.getAttribute('data-team');
        const teamId = await getNcaafTeamIdAsync(team);
        if (teamId) {
            img.onerror = function() { this.style.display = 'none'; };
            img.setAttribute('src', ncaafPrimaryLogoUrl(teamId));
        } else {
            img.style.display = 'none';
        }
    });
}

function renderEVTab(values, filteredRows = null) {
    // values[0] is header
    const headers = values[0];
    let rows = filteredRows || values.slice(1);

    // Only sort if not using filtered rows (filtered rows are already sorted)
    if (!filteredRows) {
        // Sort by date descending (most recent first)
        rows.sort((a, b) => {
            const dateA = parseDate(a[0]);
            const dateB = parseDate(b[0]);
            return dateB - dateA;
        });
    }

    // Build summary
    const totalBets = rows.length;
    const totalWagered = rows.reduce((sum, row) => sum + (parseFloat((row[5] || '').toString().replace(/[$,]/g, '')) || 0), 0);
    const totalProfit = rows.reduce((sum, row) => sum + (parseFloat((row[8] || '').toString().replace(/[$,]/g, '')) || 0), 0);
    const wonBets = rows.filter(row => parseFloat((row[8] || '').toString().replace(/[$,]/g, '')) > 0).length;
    const lostBets = rows.filter(row => parseFloat((row[8] || '').toString().replace(/[$,]/g, '')) < 0).length;
    const winRate = totalBets ? ((wonBets / totalBets) * 100).toFixed(2) : 0;
    const roi = totalWagered ? ((totalProfit / totalWagered) * 100).toFixed(2) : 0;

    // Improved summary HTML
    const summaryHTML = `
        <div class="summary-content">
            <div class="summary-stats">
                <h4>Overall Stats</h4>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-label">Total Bets</div><div class="stat-value">${totalBets}</div></div>
                    <div class="stat-card"><div class="stat-label">Record</div><div class="stat-value">${wonBets}-${lostBets}</div></div>
                    <div class="stat-card"><div class="stat-label">Total Wagered</div><div class="stat-value">${formatCurrency(totalWagered)}</div></div>
                    <div class="stat-card"><div class="stat-label">Total Profit</div><div class="stat-value">${formatCurrency(totalProfit)}</div></div>
                    <div class="stat-card"><div class="stat-label">ROI</div><div class="stat-value">${roi}%</div></div>
                    <div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value">${winRate}%</div></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('ev-summary').innerHTML = summaryHTML;

    // Prepare helpers for profit color scaling (red for losses, green for wins)
    const maxAbsProfit = rows.reduce((max, row) => {
        const p = Math.abs(parseFloat((row[8] || '0').toString().replace(/[$,]/g, '')) || 0);
        return Math.max(max, p);
    }, 0) || 1;

    function getProfitColor(amount) {
        const val = parseFloat((amount || '0').toString().replace(/[$,]/g, '')) || 0;
        const ratio = Math.min(1, Math.abs(val) / maxAbsProfit);
        // Interpolate lightness/saturation with ratio for visual intensity
        const saturation = 40 + Math.round(40 * ratio); // 40% -> 80%
        const lightness = 60 - Math.round(25 * ratio);  // 60% -> 35%
        // Hue: red 0 for negatives, green 120 for positives, neutral gray for 0
        if (val > 0) return `hsl(120, ${saturation}%, ${lightness}%)`;
        if (val < 0) return `hsl(0, ${saturation}%, ${lightness}%)`;
        return '#b3b3b3';
    }

    // Table HTML with sortable headers and Bets-table style
    const tableHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th data-sort="date" class="bet-th">Date</th>
                        <th data-sort="league" class="bet-th">Sport/League</th>
                        <th class="bet-th">Event/Teams</th>
                        <th class="bet-th">Bet Title</th>
                        <th data-sort="sportsbook" class="bet-th">Sportsbook</th>
                        <th data-sort="wager" class="bet-th">Wager</th>
                        <th data-sort="return" class="bet-th">Return</th>
                        <th data-sort="odds" class="bet-th">Odds</th>
                        <th data-sort="profit" class="bet-th">Profit</th>
                    </tr>
                </thead>
                <tbody id="ev-data">
                    ${rows.map(row => {
                        const profit = parseFloat((row[8] || '').toString().replace(/[$,]/g, ''));
                        const profitClass = profit > 0 ? 'positive' : profit < 0 ? 'negative' : '';
                        // Build cells with logos
                        const leagueKey = getLeagueKey(row[1]);
                        const [teamA, teamB] = splitTeams(row[2]);
                        const teamAKey = getTeamKey(leagueKey, teamA);
                        const teamBKey = getTeamKey(leagueKey, teamB);

                        const leagueCell = (row[1] === 'NFL')
                            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg" alt="NFL" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'MLB')
                            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Major_League_Baseball_logo.svg/640px-Major_League_Baseball_logo.svg.png" alt="MLB" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'NBA')
                            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/thumb/0/03/National_Basketball_Association_logo.svg/800px-National_Basketball_Association_logo.svg.png" alt="NBA" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'NHL')
                            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/3/3a/05_NHL_Shield.svg" alt="NHL" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'NCAAF')
                            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/en/c/cf/NCAA_football_icon_logo.svg" alt="NCAAF" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'NPB')
                            ? `<span class="league-cell"><img class="logo league" src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/NPB_logo.svg/1200px-NPB_logo.svg.png" alt="NPB" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'WNBA')
                            ? `<span class="league-cell"><img class="logo league" src="https://content.sportslogos.net/logos/16/1152/full/6613__wnba-alternate-2020.png" alt="WNBA" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'KBO')
                            ? `<span class="league-cell"><img class="logo league" src="https://r2.thesportsdb.com/images/media/league/badge/qfr1hx1589707979.png" alt="KBO" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'NCAAM')
                            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball-men.svg" alt="NCAAM" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'NCAAB')
                            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball-men.svg" alt="NCAAB" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'NCAAW')
                            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/basketball-women.svg" alt="NCAAW" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : (row[1] === 'College Baseball')
                            ? `<span class="league-cell"><img class="logo league" src="https://www.ncaa.com/modules/custom/casablanca_core/img/sportbanners/baseball.svg" alt="College Baseball" loading="lazy" onerror="this.style.display='none'"> ${row[1]}</span>`
                            : row[1];

                        const hasTeams = teamA && teamB;
                        const teamsCell = !hasTeams ? `<span>${row[2] || ''}</span>`
                            : (row[1] === 'NFL')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="NFL" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="NFL" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'MLB')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="MLB" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="MLB" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'NBA')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="NBA" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="NBA" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'NHL')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="NHL" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="NHL" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'NCAAF')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="NCAAF" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="NCAAF" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'WNBA')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="WNBA" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="WNBA" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'NCAAB')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="NCAAB" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="NCAAB" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'NCAAW')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="NCAAW" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="NCAAW" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : (row[1] === 'College Baseball')
                            ? `
                            <div class="teams-cell">
                                <img class="logo team" data-league="College Baseball" data-team="${teamA}" alt="${teamA}" loading="lazy" onerror="this.style.display='none'">
                                <span>${row[2]}</span>
                                <img class="logo team" data-league="College Baseball" data-team="${teamB}" alt="${teamB}" loading="lazy" onerror="this.style.display='none'">
                            </div>`
                            : `<span>${row[2]}</span>`;

                        return `<tr>
                            <td>${row[0]}</td>
                            <td>${leagueCell}</td>
                            <td>${teamsCell}</td>
                            <td>${row[3]}</td>
                            <td>${row[4]}</td>
                            <td>${row[5]}</td>
                            <td>${row[6]}</td>
                            <td>${row[7] || ''}</td>
                            <td class="profit ${profitClass}" style="color: ${getProfitColor(row[8])}">${row[8]}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('ev-tableContainer').innerHTML = tableHTML;
    // Hydrate external logos (NFL via Wikipedia) asynchronously
    const tableContainerEl = document.getElementById('ev-tableContainer');
    if (tableContainerEl) hydrateLogosInContainer(tableContainerEl);

    // Add sorting functionality for EV table
    const evTbody = document.getElementById('ev-data');
    const evHeaders = document.querySelectorAll('#ev-content th[data-sort]');
    let evSortState = { key: 'date', asc: false };

    function getEvColumnIndex(sortKey) {
        // Indices are table column positions, not sheet indices
        const map = { date: 0, league: 1, sportsbook: 4, wager: 5, return: 6, odds: 7, profit: 8 };
        return map[sortKey];
    }

    function sortEvTable(sortKey, isAscending) {
        const rowsArr = Array.from(evTbody.getElementsByTagName('tr'));
        rowsArr.sort((a, b) => {
            const aValue = a.cells[getEvColumnIndex(sortKey)].textContent.replace(/[$,%]/g, '');
            const bValue = b.cells[getEvColumnIndex(sortKey)].textContent.replace(/[$,%]/g, '');
            if (sortKey === 'date') {
                return isAscending ? parseDate(aValue) - parseDate(bValue) : parseDate(bValue) - parseDate(aValue);
            } else if (sortKey === 'sportsbook' || sortKey === 'league') {
                return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else {
                const numA = parseFloat(aValue) || 0;
                const numB = parseFloat(bValue) || 0;
                return isAscending ? numA - numB : numB - numA;
            }
        });
        while (evTbody.firstChild) evTbody.removeChild(evTbody.firstChild);
        rowsArr.forEach(row => evTbody.appendChild(row));
    }

    evHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const sortKey = header.getAttribute('data-sort');
            const isAscending = header.classList.toggle('asc');
            evHeaders.forEach(h => { if (h !== header) h.classList.remove('asc'); });
            sortEvTable(sortKey, isAscending);
        });
    });
}

function setupEvFilters(allEvRows) {
    originalEvData = allEvRows;

    // Get unique values for filters
    const allDates = allEvRows.map(r => r[0]).filter(d => d).sort((a, b) => parseDate(b) - parseDate(a));
    const uniqueDates = [...new Set(allDates)];
    const uniqueLeagues = [...new Set(allEvRows.map(r => (r[1] || '').trim()).filter(l => l))].sort();
    const uniqueSportsbooks = [...new Set(allEvRows.map(r => (r[4] || '').trim()).filter(s => s))].sort();

    // Populate filter dropdowns
    const dateFilter = document.getElementById('ev-dateRangeFilter');
    const leagueFilter = document.getElementById('ev-leagueFilter');
    const sportsbookFilter = document.getElementById('ev-sportsbookFilter');

    // Clear existing options (except "All")
    while (dateFilter.children.length > 1) dateFilter.removeChild(dateFilter.lastChild);
    while (leagueFilter.children.length > 1) leagueFilter.removeChild(leagueFilter.lastChild);
    while (sportsbookFilter.children.length > 1) sportsbookFilter.removeChild(sportsbookFilter.lastChild);

    uniqueDates.forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.textContent = date;
        dateFilter.appendChild(opt);
    });

    uniqueLeagues.forEach(league => {
        const opt = document.createElement('option');
        opt.value = league;
        opt.textContent = league;
        leagueFilter.appendChild(opt);
    });

    uniqueSportsbooks.forEach(sportsbook => {
        const opt = document.createElement('option');
        opt.value = sportsbook;
        opt.textContent = sportsbook;
        sportsbookFilter.appendChild(opt);
    });

    // Show filter section
    document.getElementById('ev-filterSection').style.display = 'block';

    // Add event listeners
    dateFilter.addEventListener('change', applyEvFilters);
    leagueFilter.addEventListener('change', applyEvFilters);
    sportsbookFilter.addEventListener('change', applyEvFilters);
    document.getElementById('ev-clearFiltersBtn').addEventListener('click', () => {
        dateFilter.value = '';
        leagueFilter.value = '';
        sportsbookFilter.value = '';
        applyEvFilters();
    });
}

function applyEvFilters() {
    if (!originalEvData) return;

    const dateFilter = document.getElementById('ev-dateRangeFilter');
    const leagueFilter = document.getElementById('ev-leagueFilter');
    const sportsbookFilter = document.getElementById('ev-sportsbookFilter');
    const selectedDate = dateFilter ? dateFilter.value : '';
    const selectedLeague = leagueFilter ? leagueFilter.value : '';
    const selectedSportsbook = sportsbookFilter ? sportsbookFilter.value : '';

    // Filter rows
    let filteredRows = originalEvData.filter(r => {
        const date = (r[0] || '').trim();
        const league = (r[1] || '').trim();
        const sportsbook = (r[4] || '').trim();
        const dateMatch = !selectedDate || date === selectedDate;
        const leagueMatch = !selectedLeague || league === selectedLeague;
        const sportsbookMatch = !selectedSportsbook || sportsbook === selectedSportsbook;
        return dateMatch && leagueMatch && sportsbookMatch;
    });

    // Sort by date descending
    filteredRows.sort((a, b) => parseDate(b[0]) - parseDate(a[0]));

    // Re-display with filtered data
    const values = [originalEvData.length > 0 ? ['Date', 'League', 'Event', 'Bet Title', 'Sportsbook', 'Wager', 'Return', 'Odds', 'Profit'] : [], ...filteredRows];
    renderEVTab(values, filteredRows);
}

// Store all EdgeZone rows for filtering
let allEdgeZoneRows = [];

function renderEdgeZoneTab(values) {
    const headers = values[0];
    allEdgeZoneRows = values.slice(1);

    // Extract unique channels (col 12) and leagues (col 1)
    // Normalize channel names: "Edge Matrix - Duplicate" becomes "Edge Matrix"
    const normalizeChannel = (ch) => ch.replace(/\s*-\s*Duplicate\s*$/i, '').trim();
    const allChannels = allEdgeZoneRows.map(r => normalizeChannel((r[12] || '').trim())).filter(c => c);
    const uniqueChannels = [...new Set(allChannels)].sort();
    const uniqueLeagues = [...new Set(allEdgeZoneRows.map(r => (r[1] || '').trim()).filter(l => l))].sort();

    // Populate filter dropdowns
    const channelFilter = document.getElementById('edgezone-channelFilter');
    const leagueFilter = document.getElementById('edgezone-leagueFilter');
    
    // Clear existing options (except "All")
    while (channelFilter.children.length > 1) channelFilter.removeChild(channelFilter.lastChild);
    while (leagueFilter.children.length > 1) leagueFilter.removeChild(leagueFilter.lastChild);
    
    uniqueChannels.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch;
        opt.textContent = ch;
        channelFilter.appendChild(opt);
    });
    
    uniqueLeagues.forEach(league => {
        const opt = document.createElement('option');
        opt.value = league;
        opt.textContent = league;
        leagueFilter.appendChild(opt);
    });

    // Show filter section
    document.getElementById('edgezone-filterSection').style.display = 'block';

    // Apply current filters (or show all)
    applyEdgeZoneFilters();

    // Add event listeners for filters
    channelFilter.addEventListener('change', applyEdgeZoneFilters);
    leagueFilter.addEventListener('change', applyEdgeZoneFilters);
    document.getElementById('edgezone-clearFiltersBtn').addEventListener('click', () => {
        channelFilter.value = '';
        leagueFilter.value = '';
        applyEdgeZoneFilters();
    });
}

function applyEdgeZoneFilters() {
    const channelFilter = document.getElementById('edgezone-channelFilter');
    const leagueFilter = document.getElementById('edgezone-leagueFilter');
    const selectedChannel = channelFilter ? channelFilter.value : '';
    const selectedLeague = leagueFilter ? leagueFilter.value : '';

    // Normalize channel names for matching
    const normalizeChannel = (ch) => ch.replace(/\s*-\s*Duplicate\s*$/i, '').trim();

    // Filter rows
    let filteredRows = allEdgeZoneRows.filter(r => {
        const channel = normalizeChannel((r[12] || '').trim());
        const league = (r[1] || '').trim();
        const channelMatch = !selectedChannel || channel === selectedChannel;
        const leagueMatch = !selectedLeague || league === selectedLeague;
        return channelMatch && leagueMatch;
    });

    // Sort by date (col 0) desc
    filteredRows.sort((a, b) => parseDate(b[0]) - parseDate(a[0]));

    // Summary (uses columns given in user's format):
    // 0 Date, 1 Sport/League, 2 Event/Teams, 3 Market, 4 Bet Title, 5 Sportsbook, 6 Total Wager,
    // 7 Return, 8 Odds, 9 Profit $, 10 Profit %, 11 Rolling Profit, 12 Channel, 13 Strat
    const totalBets = filteredRows.length;
    const totalWagered = filteredRows.reduce((s, r) => s + (parseFloat((r[6]||'').toString().replace(/[$,]/g, '')) || 0), 0);
    const totalProfit = filteredRows.reduce((s, r) => s + (parseFloat((r[9]||'').toString().replace(/[$,]/g, '')) || 0), 0);
    
    // Deduplicate for record calculation: same date (col 0) + Bet Title (col 4) = one bet
    const seenBets = new Set();
    const uniqueBets = [];
    filteredRows.forEach(r => {
        const date = (r[0] || '').trim();
        const betTitle = (r[4] || '').trim();
        const key = `${date}|${betTitle}`;
        if (!seenBets.has(key)) {
            seenBets.add(key);
            uniqueBets.push(r);
        }
    });
    
    // Adjusted record (deduplicated)
    const wonBetsAdjusted = uniqueBets.filter(r => (parseFloat((r[9]||'').toString().replace(/[$,]/g, '')) || 0) > 0).length;
    const lostBetsAdjusted = uniqueBets.filter(r => (parseFloat((r[9]||'').toString().replace(/[$,]/g, '')) || 0) < 0).length;
    
    // Unadjusted record (with duplicates)
    const wonBetsUnadjusted = filteredRows.filter(r => (parseFloat((r[9]||'').toString().replace(/[$,]/g, '')) || 0) > 0).length;
    const lostBetsUnadjusted = filteredRows.filter(r => (parseFloat((r[9]||'').toString().replace(/[$,]/g, '')) || 0) < 0).length;

    const totalBetsAdjusted = wonBetsAdjusted + lostBetsAdjusted;
    const winRate = totalBetsAdjusted ? ((wonBetsAdjusted / totalBetsAdjusted) * 100).toFixed(2) : 0;
    const roi = totalWagered ? ((totalProfit / totalWagered) * 100).toFixed(2) : 0;

    const summaryHTML = `
        <div class="summary-content">
            <div class="summary-stats">
                <h4>Overall Stats</h4>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-label">Total Bets (Unique)</div><div class="stat-value">${totalBets}(${totalBetsAdjusted})</div></div>
                    <div class="stat-card"><div class="stat-label">Record (Unique)</div><div class="stat-value">${wonBetsUnadjusted}-${lostBetsUnadjusted} (${wonBetsAdjusted}-${lostBetsAdjusted})</div></div>
                    <div class="stat-card"><div class="stat-label">Total Wagered</div><div class="stat-value">${formatCurrency(totalWagered)}</div></div>
                    <div class="stat-card"><div class="stat-label">Total Profit</div><div class="stat-value">${formatCurrency(totalProfit)}</div></div>
                    <div class="stat-card"><div class="stat-label">ROI</div><div class="stat-value">${roi}%</div></div>
                    <div class="stat-card"><div class="stat-label">Win Rate</div><div class="stat-value">${winRate}%</div></div>
                </div>
            </div>
        </div>`;
    document.getElementById('edgezone-summary').innerHTML = summaryHTML;

    const maxAbsProfit = filteredRows.reduce((m, r) => Math.max(m, Math.abs(parseFloat((r[9]||'0').toString().replace(/[$,]/g, '')) || 0)), 0) || 1;
    function getProfitColorEdge(amount) {
        const val = parseFloat((amount || '0').toString().replace(/[$,]/g, '')) || 0;
        const ratio = Math.min(1, Math.abs(val) / maxAbsProfit);
        const saturation = 40 + Math.round(40 * ratio);
        const lightness = 60 - Math.round(25 * ratio);
        if (val > 0) return `hsl(120, ${saturation}%, ${lightness}%)`;
        if (val < 0) return `hsl(0, ${saturation}%, ${lightness}%)`;
        return '#b3b3b3';
    }

    const tableHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th data-sort="date" class="bet-th">Date</th>
                        <th data-sort="league" class="bet-th">Sport/League</th>
                        <th class="bet-th">Event/Teams</th>
                        <th class="bet-th">Market</th>
                        <th class="bet-th">Bet Title</th>
                        <th data-sort="sportsbook" class="bet-th">Sportsbook</th>
                        <th data-sort="wager" class="bet-th">Total Wager</th>
                        <th data-sort="return" class="bet-th">Return</th>
                        <th data-sort="odds" class="bet-th">Odds</th>
                        <th data-sort="profit" class="bet-th">Profit $</th>
                        <th class="bet-th">Profit %</th>
                        <th class="bet-th">Rolling Profit</th>
                        <th class="bet-th">Channel</th>
                        <th class="bet-th">Strat</th>
                    </tr>
                </thead>
                <tbody id="edgezone-data">
                    ${filteredRows.map(r => {
                        const p = parseFloat((r[9]||'').toString().replace(/[$,]/g, ''));
                        const profitClass = p > 0 ? 'positive' : p < 0 ? 'negative' : '';
                        return `<tr>
                            <td>${r[0] || ''}</td>
                            <td>${r[1] || ''}</td>
                            <td>${r[2] || ''}</td>
                            <td>${r[3] || ''}</td>
                            <td>${r[4] || ''}</td>
                            <td>${r[5] || ''}</td>
                            <td>${r[6] || ''}</td>
                            <td>${r[7] || ''}</td>
                            <td>${r[8] || ''}</td>
                            <td class="profit ${profitClass}" style="color: ${getProfitColorEdge(r[9])}">${r[9] || ''}</td>
                            <td>${r[10] || ''}</td>
                            <td>${r[11] || ''}</td>
                            <td>${r[12] || ''}</td>
                            <td>${r[13] || ''}</td>
                        </tr>`;}).join('')}
                </tbody>
            </table>
        </div>`;

    document.getElementById('edgezone-tableContainer').innerHTML = tableHTML;

    // Sorting
    const ezTbody = document.getElementById('edgezone-data');
    const ezHeaders = document.querySelectorAll('#edgezone-content th[data-sort]');
    function getEzColumnIndex(key) {
        const map = { date: 0, league: 1, sportsbook: 5, wager: 6, return: 7, odds: 8, profit: 9 };
        return map[key];
    }
    function sortEzTable(key, asc) {
        const rowsArr = Array.from(ezTbody.getElementsByTagName('tr'));
        rowsArr.sort((a, b) => {
            const aVal = a.cells[getEzColumnIndex(key)].textContent.replace(/[$,%]/g, '');
            const bVal = b.cells[getEzColumnIndex(key)].textContent.replace(/[$,%]/g, '');
            if (key === 'date') return asc ? parseDate(aVal) - parseDate(bVal) : parseDate(bVal) - parseDate(aVal);
            if (key === 'sportsbook' || key === 'league') return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            const na = parseFloat(aVal) || 0, nb = parseFloat(bVal) || 0;
            return asc ? na - nb : nb - na;
        });
        while (ezTbody.firstChild) ezTbody.removeChild(ezTbody.firstChild);
        rowsArr.forEach(row => ezTbody.appendChild(row));
    }
    ezHeaders.forEach(h => {
        h.addEventListener('click', () => {
            const key = h.getAttribute('data-sort');
            const asc = h.classList.toggle('asc');
            ezHeaders.forEach(o => { if (o !== h) o.classList.remove('asc'); });
            sortEzTable(key, asc);
        });
    });
}
