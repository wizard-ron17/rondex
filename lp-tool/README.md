# Welcome to [Ron's LP Tool](https://rondex.xyz/lp-tool)
A simple calculator to show the value of your Alephium LP Tokens

## How It Works:
It all starts from the user's input into the site, which is an amount of LP Tokens. You might find this number in your Alephium Wallet, on a portfolio viewer like [alph.pro](https://alph.pro), or directly on [Ayin Decentralized Exhange](https://ayin.app) in the [Pounder](https://ayin.app/vault) or in [LP Staking](https://ayin.app/stake). You punch this number into the LP Tool site, click go, and can view the value of the given amount of LP tokens - showing values for both $ALPH and the other token in the pair, as well as the sum of these values. Values are also displayed in USD conversions.

### Calculation:
First, I pull in external data from [Mobula API](https://docs.mobula.io/api-reference/endpoint/market-pair). This data source is *free* and very useful. From this API, we pull in 4 values:
- **Pooled ALPH** - The total balance of token0 in the pool (this is $ALPH in all supported pairs on the tool)
- **Pooled Token** - The total balance of token1 in the pool (not $ALPH, a project token like $AYIN or $APAD)
- **Price ALPH** - The USD price of token0 (the USD price of $ALPH)
- **USD Price of Token** - The USD price of token1 (the USD price of the other token in the pair)
- **ALPH Price of Token** - The price of token1 (the ALPH price/ratio of the pair - can be calulated by dividing PooledALPH by PooledToken)

Using these numbers, now we can calculate the total supply of LP Tokens that exist for this pair. AYIN is a fork of Uniswap v2, which uses the following equation for liquidity token supply:  
$$LPsupply = \sqrt(Pooled ALPH * Pooled Token)$$  
Now that we know the total amount of LP tokens (***LPSupply***) for this pool, we can divide the inputted amount of LP Tokens on the site by ***LPSupply*** to find ***poolShare***, a percentage of the total pool, or a number between 0 and 1. The rest is easy.

The 3 Values shown on the LP Tool Site is as follows:
- **Your ALPH in LP**
- **Your <token> in LP**
- **Total Value**

These are simply calculated by multiplying the user's **poolShare** by the respective asset's pooled value(***Pooled ALPH***, ***Pooled Token***). The ***Total Value*** is just the sum of the other 2 values, but displaying the token amount in its alph value using the **ALPH Price of Token** from before.
