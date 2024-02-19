import { ethers } from "hardhat";
import { abi as factoryAbi } from "../artifacts/contracts/Factory.sol/Factory.json";
import { FACTORY_ADDRESS } from "../utils/constants";

async function main() {
  const [wallet1, wallet2, wallet3] = await ethers.getSigners();
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi);

  console.log("1", "0x73157413479Cf449601cc6C022C7985222166E44");
  console.log("2", wallet3.address);
  const tx = await factory.connect(wallet2 as any).newAccount(wallet3.address);
  console.log(tx);
}

main();
