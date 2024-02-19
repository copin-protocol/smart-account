import { ethers, network } from "hardhat";
import marketAbi from "../utils/abis/marketAbi";
import { SMART_ACCOUNT_ADDRESS } from "../utils/constants";
import { CopinNetworkConfig } from "../utils/types/config";

async function main() {
  const [, wallet2] = await ethers.getSigners();
  const market = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;
  // const market = "0x2B3bb4c683BFc5239B029131EEf3B1d214478d93";
  const perp = new ethers.Contract(market, marketAbi, wallet2);

  const orderInfo = await perp.orderFee(
    ethers.utils.parseEther("0.01").mul(-1),
    2
  );
  console.log("orderInfo", orderInfo);

  const price = await perp.assetPrice();
  console.log(ethers.utils.formatEther(price.price), price);
  const key = await perp.marketKey();
  console.log("key", key);
  const accessibleMargin = await perp.accessibleMargin(SMART_ACCOUNT_ADDRESS);
  console.log(
    "accessibleMargin",
    ethers.utils.formatEther(accessibleMargin.marginAccessible),
    accessibleMargin.invalid
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
