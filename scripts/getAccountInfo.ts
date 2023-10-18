import { ethers } from "hardhat";
import { abi as accountAbi } from "../artifacts/contracts/AccountSNX.sol/AccountSNX.json";
import { SMART_ACCOUNT_ADDRESS } from "../utils/constants";

async function main() {
  const [, wallet2] = await ethers.getSigners();
  const account = new ethers.Contract(
    SMART_ACCOUNT_ADDRESS,
    accountAbi,
    wallet2
  );
  const availableMargin = await account.availableMargin();
  console.log("availableMargin", ethers.utils.formatEther(availableMargin));
  const lockedMargin = await account.lockedMargin();
  console.log("lockedMargin", ethers.utils.formatEther(lockedMargin));
}

main();
