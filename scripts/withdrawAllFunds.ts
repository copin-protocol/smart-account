// 0x81f6db11736589eab14b59c5251c27482e6c7c12
import { ethers, network } from "hardhat";
import { abi as accountAbi } from "../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { CopinNetworkConfig } from "../utils/types/config";
import marketAbi from "../utils/abis/marketAbi";
import { SMART_ACCOUNT_ADDRESS } from "../utils/constants";
import { withdrawAllFunds } from "../utils/perps";
// const { formatUnits } = require("ethers/lib/utils");

async function main() {
  const [, wallet2] = await ethers.getSigners();
  const account = new ethers.Contract(
    SMART_ACCOUNT_ADDRESS,
    accountAbi,
    wallet2
  );
  const market = (network.config as CopinNetworkConfig).SNX_MARKET_LINK;
  const perp = new ethers.Contract(market, marketAbi, wallet2);

  const { commands, inputs } = await withdrawAllFunds({
    account,
    market: perp,
  });

  const tx = await account.connect(wallet2 as any).execute(commands, inputs);
  console.log("tx", tx);
}

main();
