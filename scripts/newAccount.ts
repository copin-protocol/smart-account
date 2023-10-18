import { ethers } from "hardhat";
import { abi as factoryAbi } from "../artifacts/contracts/Factory.sol/Factory.json";
import { FACTORY_ADDRESS } from "../utils/constants";

async function main() {
  const [wallet1, wallet2] = await ethers.getSigners();
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi);
  const tx = await factory.connect(wallet2 as any).newAccount(wallet1.address);
  console.log(tx);
}

main();
