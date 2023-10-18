// 0x81f6db11736589eab14b59c5251c27482e6c7c12
import { ethers } from "hardhat";
import { abi as accountAbi } from "../../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { SMART_ACCOUNT_ADDRESS } from "../../utils/constants";

async function main() {
  const [wallet1, wallet2] = await ethers.getSigners();
  const account = new ethers.Contract(SMART_ACCOUNT_ADDRESS, accountAbi);
  const tx = await account.connect(wallet2 as any).addDelegate(wallet1.address);
  console.log("tx", tx);
}

main();
