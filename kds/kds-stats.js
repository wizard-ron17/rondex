async function makeGraphQLQuery(query) {
    try {
        const response = await fetch('https://api.kdswap.exchange/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query
            })
        });

        const responseData = await response.json();
        return responseData.data;
    } catch (error) {
        console.error('Error making GraphQL query:', error);
        throw error;
    }
}

function calculateDaysSince() {
    const currentDate = new Date();
    const referenceDate = new Date('2022-05-16');
    const daysSince = Math.floor((currentDate - referenceDate) / (1000 * 60 * 60 * 24));
    return daysSince;
}

const query1H = `{
    price(token: "kdlaunch.kdswap-token", period: 1) {
        id
        timestamp
        priceInKda
        intervalStamp
    }
}`;

const queryDaysSince = `{
    price(token: "kdlaunch.kdswap-token", period: ${calculateDaysSince()}) {
        id
        timestamp
        priceInKda
        intervalStamp
    }
}`;

async function fetchData() {
    try {
        const data1H = await makeGraphQLQuery(query1H);
        const dataDaysSince = await makeGraphQLQuery(queryDaysSince);

        // Fetch the current price from the 1-hour query
        const currentPrice = parseFloat(data1H.price[0].priceInKda).toPrecision(4);
        const FDMC = currentPrice * 250000000;

        // Combine price data from both the 1-hour and daysSince queries
        const combinedPriceData = data1H.price.concat(dataDaysSince.price);

        let allTimeHigh = Number.MIN_VALUE;
        let allTimeLow = Number.MAX_VALUE;

        // Iterate over the combined price data to find the overall max and min
        for (const priceData of combinedPriceData) {
            const price = parseFloat(priceData.priceInKda);
            allTimeHigh = Math.max(allTimeHigh, price);
            allTimeLow = Math.min(allTimeLow, price);
        }

        allTimeHigh = allTimeHigh.toPrecision(4);
        allTimeLow = allTimeLow.toPrecision(4);

        document.getElementById("currentPrice").innerText = `${currentPrice} $KDA`;
        document.getElementById("allTimeHigh").innerText = `${allTimeHigh} $KDA`;
        document.getElementById("allTimeLow").innerText = `${allTimeLow} $KDA`;
        document.getElementById("FDMC").innerText = `${parseFloat(FDMC).toLocaleString()} $KDA`;
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById("currentPrice").innerText = "Error fetching current price";
        document.getElementById("allTimeHigh").innerText = "Error fetching all-time high";
        document.getElementById("allTimeLow").innerText = "Error fetching all-time low";
    }
}

fetchData();
