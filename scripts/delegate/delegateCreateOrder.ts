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
  const [wallet1, wallet2, wallet3] = await ethers.getSigners();
  const account = new ethers.Contract(
    SMART_ACCOUNT_ADDRESS,
    accountAbi,
    wallet2
  );
  const marginAsset = (network.config as CopinNetworkConfig).MARGIN_ASSET;
  const marketETH = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;
  const marketBTC = (network.config as CopinNetworkConfig).SNX_MARKET_BTC;
  const marketLINK = (network.config as CopinNetworkConfig).SNX_MARKET_LINK;
  const margin = new ethers.Contract(marginAsset, marginAssetAbi, wallet2);

  await depositFunds({
    funds: ethers.utils.parseEther("56"),
    account,
    marginAsset: margin,
  });
  const perpETH = new ethers.Contract(marketETH, marketAbi, wallet3);
  const perpBTC = new ethers.Contract(marketBTC, marketAbi, wallet3);
  const perpLINK = new ethers.Contract(marketLINK, marketAbi, wallet3);

  const { commands, inputs } = await placeOrder({
    market: perpETH,
    markets: [perpETH, perpBTC, perpLINK],
    account,
    amount: ethers.utils.parseEther("50"),
    // isLong: false,
    // increase: false,
  });

  console.log(commands);

  // return;

  const tx = await account.connect(wallet3 as any).execute(commands, inputs);
  console.log("tx", tx);
}

main();
