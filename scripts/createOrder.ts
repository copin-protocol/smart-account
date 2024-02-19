// 0x81f6db11736589eab14b59c5251c27482e6c7c12
import { ethers, network } from "hardhat";
import { abi as accountAbi } from "../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { abi as marginAssetAbi } from "../artifacts/contracts/test/MarginAsset.sol/MarginAsset.json";
import { CopinNetworkConfig } from "../utils/types/config";
import marketAbi from "../utils/abis/marketAbi";
import { calculateDesiredFillPrice, placeOrder } from "../utils/perps";
import { SMART_ACCOUNT_ADDRESS } from "../utils/constants";
// const { formatUnits } = require("ethers/lib/utils");

async function main() {
  const [, wallet2] = await ethers.getSigners();
  const account = new ethers.Contract(
    SMART_ACCOUNT_ADDRESS,
    accountAbi,
    wallet2
  );
  console.log("account", account.address);
  const marginAsset = (network.config as CopinNetworkConfig).MARGIN_ASSET;
  const marketETH = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;
  const margin = new ethers.Contract(marginAsset, marginAssetAbi);

  // await margin
  //   .connect(wallet2 as any)
  //   .approve(account.address, ethers.utils.parseEther("100"));
  const perp = new ethers.Contract(marketETH, marketAbi, wallet2);

  console.log("perp", perp.address);

  const { commands, inputs } = await placeOrder({
    market: perp,
    markets: [perp],
    account,
  });

  console.log("commands", commands);
  console.log("inputs", inputs);

  const tx = await account.connect(wallet2 as any).execute(commands, inputs);
  console.log("tx", tx);
}

main();
