import { ethers } from "hardhat";
import { abi as taskCreatorAbi } from "../../artifacts/contracts/TaskCreator.sol/TaskCreator.json";
import { TASK_CREATOR_ADDRESS } from "../../utils/constants";
import { parseEther } from "ethers/lib/utils";

async function main() {
  const [wallet1] = await ethers.getSigners();
  const taskCreator = new ethers.Contract(
    TASK_CREATOR_ADDRESS,
    taskCreatorAbi,
    wallet1
  );
  const tx = await taskCreator.depositFunds1Balance(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    parseEther("0.05"),
    {
      value: parseEther("0.05"),
    }
  );
  console.log(tx);
}

main();
