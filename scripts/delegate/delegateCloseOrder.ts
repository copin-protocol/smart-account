// 0x81f6db11736589eab14b59c5251c27482e6c7c12
import { ethers, network } from "hardhat";
import { abi as accountAbi } from "../../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { CopinNetworkConfig } from "../../utils/types/config";
import marketAbi from "../../utils/abis/marketAbi";
import { calculateDesiredFillPrice, closeOrder } from "../../utils/perps";
import { SMART_ACCOUNT_ADDRESS } from "../../utils/constants";
// const { formatUnits } = require("ethers/lib/utils");

async function main() {
  const [wallet1, wallet2, wallet3] = await ethers.getSigners();
  const account = new ethers.Contract(
    SMART_ACCOUNT_ADDRESS,
    accountAbi,
    wallet3
  );
  const market = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;

  const perp = new ethers.Contract(market, marketAbi, wallet3);

  const { commands, inputs } = await closeOrder({
    market: perp,
    account,
  });

  console.log(commands);

  const tx = await account.execute(commands, inputs);
  console.log("tx", tx);
}

main();
