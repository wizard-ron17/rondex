# Welcome to Ron's LP Tool
A simple calculator to show the value of your Alephium LP Tokens

## How It Works:
It all starts from the user's input into the site, which is an amount of LP Tokens. You might find this number in your Alephium Wallet, on a portfolio viewer like alph.pro, or directly on [Ayin Decentralized Exhange](ayin.app) in the [Pounder](ayin.app/vault) or in [LP Staking](ayin.app/stake).

### Calculation:
First, lets pull in external data from [Mobula API]()  


const pooledAlph = parseFloat(data.data.token0.approximateReserveToken);
          const pooledAyin = parseFloat(data.data.token1.approximateReserveToken);
          const priceAlph = data.data.token0.price;
          const priceAyin = data.data.token1.price;
          const priceAyinInAlph = data.data.token1.priceToken;

          const liquidity = Math.sqrt(pooledAlph * pooledAyin);
          const userPoolShare = lpTokens / liquidity;
          const valueOfAlph = userPoolShare * pooledAlph; // User balance alph
          const valueOfAyin = userPoolShare * pooledAyin; // User balance ayin
          const totalValue = valueOfAlph + (valueOfAyin * priceAyinInAlph); // User total balance in alph
          const USDvalueAlph = valueOfAlph * priceAlph;
          const USDvalueAyin = (valueOfAyin * priceAyinInAlph) * priceAlph;
          const USDtotalValue = totalValue * priceAlph;
