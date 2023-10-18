// 0x81f6db11736589eab14b59c5251c27482e6c7c12
import { ethers, network } from "hardhat";
import { abi as accountAbi } from "../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { CopinNetworkConfig } from "../utils/types/config";
import { SMART_ACCOUNT_ADDRESS } from "../utils/constants";
// const { formatUnits } = require("ethers/lib/utils");

async function main() {
  const [, wallet2] = await ethers.getSigners();
  const account = new ethers.Contract(SMART_ACCOUNT_ADDRESS, accountAbi);
  const marketETH = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;

  const abi = ethers.utils.defaultAbiCoder;

  const tx = await account.connect(wallet2 as any).execute(
    [2],
    [abi.encode(["address"], [marketETH])]
    // {
    //   gasLimit: 3_000_000,
    // }
  );
  console.log("tx", tx);
}

main();
