// 0x81f6db11736589eab14b59c5251c27482e6c7c12
import { ethers, network } from "hardhat";
import { abi as accountAbi } from "../../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { abi as marginAssetAbi } from "../../artifacts/contracts/test/MarginAsset.sol/MarginAsset.json";
import { CopinNetworkConfig } from "../../utils/types/config";
import { SMART_ACCOUNT_ADDRESS } from "../../utils/constants";
// const { formatUnits } = require("ethers/lib/utils");

async function main() {
  const [wallet1, wallet2] = await ethers.getSigners();
  const account = new ethers.Contract(
    SMART_ACCOUNT_ADDRESS,
    accountAbi,
    wallet1
  );
  const market = (network.config as CopinNetworkConfig).SNX_MARKET_LINK;

  const abi = ethers.utils.defaultAbiCoder;

  const tx = await account.execute([2], [abi.encode(["address"], [market])]);
  console.log("tx", tx);
}

main();
