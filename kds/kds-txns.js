// Fetch data from the API
async function fetchTransactionData() {
    const query = `{
        swapsForToken(token: "kdlaunch.kdswap-token", limit: 50, offset: 1) {
            id
            timestamp
            token0Amount
            token1Amount
            intervalStamp
            token0 {
                tokenSymbol
                icon
                validated
            }
            token1 {
                tokenSymbol
                icon
                validated
            }
            account
        }
    }`;

    try {
        const response = await fetch('https://kdswap-fd-prod-cpeabrdfgdg9hzen.z01.azurefd.net/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query
            })
        });

        const responseData = await response.json();
        const transactions = responseData.data.swapsForToken;

        // Update the table with fetched data
        updateTransactionTable(transactions);
    } catch (error) {
        console.error('Error fetching transaction data:', error);
    }
}

// Function to format date as relative time
function formatRelativeTime(timestamp) {
    const currentDate = new Date();
    const transactionDate = new Date(timestamp);
    const timeDifference = currentDate - transactionDate;
    const minutesAgo = Math.floor(timeDifference / (1000 * 60));

    if (minutesAgo < 60) {
        return `${minutesAgo}m ago`;
    } else {
        const hoursAgo = Math.floor(minutesAgo / 60);
        return `${hoursAgo}h ago`;
    }
}

// Update the table with transaction data
function updateTransactionTable(transactions) {
    const tableBody = document.getElementById('recordTableBody');

    // Clear existing rows
    tableBody.innerHTML = '';

    // Specify the hash for which you want to replace the account text
    const targetHash = 'k:f8c01f1b062ebccc7164dd61479a655b9a6373bb2642904b2b1617230cdc51cc';

    // Populate the table with new data
    transactions.forEach(transaction => {
        const row = document.createElement('tr');

        // Determine the type based on token0 symbol
        const transactionType = transaction.token0.tokenSymbol === 'KDA' ? 'BUY' : 'SELL';

        // Display only the first 3 and last 4 characters of the account with dots in the middle
        const truncatedAccount = `${transaction.account.slice(0, 5)}...`;

        // Check if the account matches the target hash
        if (transaction.account === targetHash) {
            // If it matches, set text to 'MW' and apply red color
            row.innerHTML = `
                <td>${formatRelativeTime(transaction.timestamp)}</td>
                <td class="${transactionType.toLowerCase()}">${transactionType}</td>
                <td>${formatTokenInfo(transaction.token0, transaction.token0Amount)}</td>
                <td>${formatTokenInfo(transaction.token1, transaction.token1Amount)}</td>
                <td><a href="https://kdaexplorer.com/account/${transaction.account}" target="_blank" style="color: red; font-weight: bold;">MW</a></td>
            `;
        } else {
            // If it doesn't match, proceed with the regular display
            row.innerHTML = `
                <td>${formatRelativeTime(transaction.timestamp)}</td>
                <td class="${transactionType.toLowerCase()}">${transactionType}</td>
                <td>${formatTokenInfo(transaction.token0, transaction.token0Amount)}</td>
                <td>${formatTokenInfo(transaction.token1, transaction.token1Amount)}</td>
                <td><a href="https://kdaexplorer.com/account/${transaction.account}" target="_blank">${truncatedAccount}</a></td>
            `;
        }

        tableBody.appendChild(row);
    });
}


// Function to format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
    };

    return date.toLocaleString(undefined, options);
}

// Function to format token information (symbol, icon, and amount)
function formatTokenInfo(token, amount) {
    // Round the amount to 2 decimal places
    const roundedAmount = parseFloat(amount).toFixed(2);

    // Use custom icons for KDA and WIZA
    const customIcons = {
        'KDA': 'https://swap.ecko.finance/images/crypto/kda-crypto.svg',
        'WIZA': 'https://assets.kdlaunch.com/tokens/wiza.jpg'
    };

    // Check if the token has a custom icon
    const customIcon = customIcons[token.tokenSymbol];

    // If a custom icon exists, use it; otherwise, use the API icon
    const iconSrc = customIcon ? customIcon : token.icon;

    return `<img src="${iconSrc}" alt="${token.tokenSymbol}" class="token-logo"> ${roundedAmount} $${token.tokenSymbol}`;
}

// Fetch transaction data on page load
document.addEventListener("DOMContentLoaded", fetchTransactionData);
