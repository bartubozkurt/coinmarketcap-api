const { Telegraf } = require("telegraf");
const cron = require("node-cron");
require("dotenv").config();
const sleep = require("sleep-promise");
const express = require("express");
const http = require("http");
const Web3 = require("web3");
const axios = require("axios");
const date = new Date();

const PORT = 3000;
const app = express();
const server = http
  .createServer(app)
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
const web3 = new Web3("https://bsc-dataseed.binance.org/");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
lastBuy = [];

// ! PANCAKE FACTORY
const PANCAKE_FACTORY_ABI = require("./factory_abi.json");
const { Console } = require("console");
const PANCAKE_FACTORY_ADDRESS = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const PANCAKE_FACTORY_CONTRACT = new web3.eth.Contract(
  PANCAKE_FACTORY_ABI,
  PANCAKE_FACTORY_ADDRESS
);

const wbnbAddress = web3.utils.toChecksumAddress(
  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
);
const tokenAdress = web3.utils.toChecksumAddress(TOKEN_ADDRESS);

async function getBnbPrice() {
  const response = await axios.get(
    "https://api.binance.com/api/v3/ticker/price",
    {
      params: {
        symbol: "BNBUSDT",
      },
    }
  );
  bnbPrice = response.data.price;

  return parseFloat(bnbPrice);
}

async function run() {
  const pairAddress = await PANCAKE_FACTORY_CONTRACT.methods
    .getPair(wbnbAddress, tokenAdress)
    .call();
  const PAIR_ABI = require("./pair_abi.json");
  const pairContract = new web3.eth.Contract(PAIR_ABI, pairAddress);

  const token0 = await pairContract.methods.token0().call();
  const token1 = await pairContract.methods.token1().call();

  console.log("token0: ", token0);
  console.log("token1: ", token1);
  console.log("pairAddress: ", pairAddress);

  let reserves = await pairContract.methods.getReserves().call();

  console.log("reserves0", reserves[0]);
  console.log("reserves1", reserves[1]);

  if (token1 == wbnbAddress) {
    console.log("token1 is wbnb");
    const reserveWBNB =
      (parseFloat(reserves[1]) / parseFloat(reserves[0])) *
      (await getBnbPrice());

    console.log("token bnb price ==> ", reserveWBNB);
    return reserveWBNB;
  } else {
    console.log("token0 is wbnb");
    return;
  }
}

let priceMonitor;
let monitoringPrice = false;

async function monitorPriceFunc() {
  if (monitoringPrice) {
    return;
  }
  console.log("monitoring price....");
  monitoringPrice = true;

  try {
    await run().then((price) => {
      console.log("price: ", price);
      lastBuy.push(price);

      console.log("lastBuy: ", lastBuy);
    });

    console.log("lastBuy: ", lastBuy);
  } catch (e) {
    console.log(e);
    monitoringPrice = false;
    clearInterval(priceMonitor);
    return;
  }

  monitoringPrice = false;
}

const POLLING_INTERVAL = 10000; // 10 second

priceMonitor = setInterval(async () => {
  await monitorPriceFunc();
}, POLLING_INTERVAL);

async function getCookieInfo() {
  const list = [];
  const response = await axios.get(
    "here",
    {
      qs: {
        start: 1,
        limit: 5000,
        convert: "usd",
      },
      headers: {
        "here",
      },
      json: true,
      gzip: true,
    }
  );
  const change =
    response.data["data"]["COOKIE"][0]["quote"]["USD"]["percent_change_24h"];
  const volume =
    response.data["data"]["COOKIE"][0]["quote"]["USD"]["volume_24h"];

  list.push(change.toFixed(2));
  list.push(volume.toLocaleString());

  console.log(change);
  console.log(volume);

  return list;
}

bot.command("marco", async (ctx) => {
  ctx.reply(
    "Live price bot monitoring every 3 hours but you can call me anytime you want. just call /marco I am Updated !! :)"
  );

  const CookiePrice = await run();
  const price = await getCookieInfo();

  if (CookiePrice < lastBuy[lastBuy.length - 1]) {
    ctx.reply(
      `🚨🚨🚨🚨🚨🚨🚨\n\n<b>COOKIE PRICE:</b> <code>${parseFloat(
        CookiePrice
      ).toFixed(7)}$</code>\n<b>COOKIE 24H CHANGE:</b> <code>${
        price[0]
      }½ ⬇️⬇️</code>\n<b>COOKIE 24H VOLUME:</b> <code>${
        price[1]
      }</code>\n\n<a href="https://www.dextools.io/app/en/bnb/pair-explorer/0x204e54b9b7272551a4c5304b044b334e0224aa8a">📈 Live chart</a> <a href="https://exchange.pancakeswap.finance/#/swap?outputCurrency=0x6d342877fC199c629f49A5C6C521C297b15BC92d">🍪 Buy Cookie</a> <a href="https://www.coinmarketcap.com/currencies/cookie/">🚩 Coinmarketcap</a> <a href="https://twitter.com/cookiesaleio">💸 Twitter</a>`,
      { parse_mode: "html" }
    );
  } else {
    ctx.reply(
      `🚨🚨🚨🚨🚨🚨\n\n<b>COOKIE PRICE:</b> <code>${parseFloat(
        CookiePrice
      ).toFixed(7)}$</code>\n<b>COOKIE 24H CHANGE:</b> <code>${
        price[0]
      }½ ⬆️⬆️</code>\n<b>COOKIE 24H VOLUME:</b> <code>${
        price[1]
      }</code>\n\n<a href="https://www.dextools.io/app/en/bnb/pair-explorer/0x204e54b9b7272551a4c5304b044b334e0224aa8a">📈 Live chart</a> <a href="https://exchange.pancakeswap.finance/#/swap?outputCurrency=0x6d342877fC199c629f49A5C6C521C297b15BC92d">🍪 Buy Cookie</a> <a href="https://www.coinmarketcap.com/currencies/cookie/">🚩 Coinmarketcap</a> <a href="https://twitter.com/cookiesaleio">💸 Twitter</a>`,
      { parse_mode: "html" }
    );
  }
});

bot.start((ctx) => {
  let message = `BOT started at <b>${new Date().toLocaleString()}</b> price monitoring <b>every 3 hours.</b> wait...\n---\n`;
  ctx.reply(message, { parse_mode: "html" });
  cron.schedule("0 */3 * * *", async () => {
    await monitorPriceFunc();

    const CookiePrice = await run();
    const price = await getCookieInfo();

    if (CookiePrice < lastBuy[lastBuy.length - 1]) {
      ctx.reply(
        `🚨🚨🚨🚨🚨🚨🚨\n\n<b>COOKIE PRICE:</b> <code>${parseFloat(
          CookiePrice
        ).toFixed(7)}$</code>\n<b>COOKIE 24H CHANGE:</b> <code>${
          price[0]
        }½ ⬇️⬇️</code>\n<b>COOKIE 24H VOLUME:</b> <code>${
          price[1]
        }</code>\n\n<a href="https://www.dextools.io/app/en/bnb/pair-explorer/0x204e54b9b7272551a4c5304b044b334e0224aa8a">📈 Live chart</a> <a href="https://exchange.pancakeswap.finance/#/swap?outputCurrency=0x6d342877fC199c629f49A5C6C521C297b15BC92d">🍪 Buy Cookie</a> <a href="https://www.coinmarketcap.com/currencies/cookie/">🚩 Coinmarketcap</a> <a href="https://www.bscscan.com/token/0x6d342877fC199c629f49A5C6C521C297b15BC92d">🚩 Bscscan</a> <a href="https://twitter.com/cookiesaleio">💸 Twitter</a>`,
        { parse_mode: "html" }
      );
    } else {
      ctx.reply(
        `🚨🚨🚨🚨🚨🚨\n\n<b>COOKIE PRICE:</b> <code>${parseFloat(
          CookiePrice
        ).toFixed(7)}$</code>\n<b>COOKIE 24H CHANGE:</b> <code>${
          price[0]
        }½ ⬆️⬆️</code>\n<b>COOKIE 24H VOLUME:</b> <code>${
          price[1]
        }</code>\n\n<a href="https://www.dextools.io/app/en/bnb/pair-explorer/0x204e54b9b7272551a4c5304b044b334e0224aa8a">📈 Live chart</a> <a href="https://exchange.pancakeswap.finance/#/swap?outputCurrency=0x6d342877fC199c629f49A5C6C521C297b15BC92d">🍪 Buy Cookie</a> <a href="https://www.coinmarketcap.com/currencies/cookie/">🚩 Coinmarketcap</a> <a href="https://www.bscscan.com/token/0x6d342877fC199c629f49A5C6C521C297b15BC92d">🚩 Bscscan</a> <a href="https://twitter.com/cookiesaleio">💸 Twitter</a>`,
        { parse_mode: "html" }
      );
    }
  });
});

bot.launch();

process.once("sigint", () => bot.stop("sigint"));
process.once("sigterm", () => bot.stop("sigterm"));
