// 0x81f6db11736589eab14b59c5251c27482e6c7c12
import { ethers, network } from "hardhat";
import { abi as accountAbi } from "../../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { abi as marginAssetAbi } from "../../artifacts/contracts/test/MarginAsset.sol/MarginAsset.json";
import { CopinNetworkConfig } from "../../utils/types/config";
import marketAbi from "../../utils/abis/marketAbi";
import { calculateDesiredFillPrice, placeOrder } from "../../utils/perps";
import { SMART_ACCOUNT_ADDRESS } from "../../utils/constants";
import { depositFunds } from "../../utils/accounts";
// const { formatUnits } = require("ethers/lib/utils");

async function main() {
  const [wallet1, wallet2] = await ethers.getSigners();
  const account = new ethers.Contract(
    SMART_ACCOUNT_ADDRESS,
    accountAbi,
    wallet1
  );
  const marginAsset = (network.config as CopinNetworkConfig).MARGIN_ASSET;
  const marketETH = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;
  const margin = new ethers.Contract(marginAsset, marginAssetAbi);

  // await depositFunds({
  //   account,
  //   marginAsset: margin,
  // });
  const perp = new ethers.Contract(marketETH, marketAbi, wallet1);

  const { commands, inputs } = await placeOrder({
    market: perp,
    account,
    amount: ethers.utils.parseEther("20"),
    increase: false,
  });

  console.log(commands);

  return;

  const tx = await account.connect(wallet1 as any).execute(commands, inputs);
  console.log("tx", tx);
}

main();
