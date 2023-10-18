import { ethers, network } from "hardhat";
import marketAbi from "../utils/abis/marketAbi";
import { SMART_ACCOUNT_ADDRESS } from "../utils/constants";
import { CopinNetworkConfig } from "../utils/types/config";

async function main() {
  const [, wallet2] = await ethers.getSigners();
  const marketETH = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;
  const perp = new ethers.Contract(marketETH, marketAbi, wallet2);

  const price = await perp.assetPrice();
  console.log(ethers.utils.formatEther(price.price));
  const accessibleMargin = await perp.accessibleMargin(SMART_ACCOUNT_ADDRESS);
  console.log(
    "accessibleMargin",
    ethers.utils.formatEther(accessibleMargin.marginAccessible)
  );
  const remainingMargin = await perp.remainingMargin(SMART_ACCOUNT_ADDRESS);
  console.log(
    "remainingMargin",
    ethers.utils.formatEther(remainingMargin.marginRemaining)
  );
  const position = await perp.positions(SMART_ACCOUNT_ADDRESS);
  console.log(
    "position",
    Object.entries(position).map(([key, value]: any[]) => ({
      [key]: ethers.utils.formatEther(value),
    }))
  );

  const delayedOrder = await perp.delayedOrders(SMART_ACCOUNT_ADDRESS);
  console.log(
    "delayedOrder",
    Object.entries(delayedOrder).map(([key, value]: any[]) => {
      let val = value;
      try {
        val = ethers.utils.formatEther(value);
      } catch (err) {}
      return {
        [key]: val,
      };
    })
  );

  // const tx = await perp.transferMargin(utils.parseEther("50"));
  // const tx = await perp.withdrawAllMargin();
  // console.log(tx);
}

main();
