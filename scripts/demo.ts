import { formatEther, parseEther } from "@ethersproject/units";
import { ethers, network } from "hardhat";
import marketAbi from "../utils/abis/marketAbi";
import { SMART_ACCOUNT_ADDRESS } from "../utils/constants";
import { CopinNetworkConfig } from "../utils/types/config";
import { BigNumber } from "ethers";
import { calculateDesiredFillPrice } from "../utils/perps";

export enum SYNTHETIX_FUNCTION_CODE {
  ACCOUNT_MODIFY_MARGIN,
  ACCOUNT_WITHDRAW_ETH,
  PERP_CANCEL_ORDER,
  PERP_WITHDRAW_ALL_MARGIN,
  PERP_MODIFY_MARGIN,
  PERP_SUBMIT_CREATE_ORDER,
  PERP_SUBMIT_CLOSE_ORDER,
  DELEGATE_DEPOSIT_MARGIN,
}

const abi = ethers.utils.defaultAbiCoder;

async function main() {
  const doc = {
    type: "PLACE_ORDER",
    perpMarketAddress: "0x0EA09D97b4084d859328ec4bF8eBCF9ecCA26F1D",
    pair: "SOL-USDT",
    smartWalletAddress: "0xa3089D1Ab6B83DBaF22e9c1eEe90a41ab2eD3018",
    sourceAccount: "0x160A8D28D63961297e51E4f1a0401bf4D27f5162",
    userId: "6538c027b33a35cfd9c320f1",
    copyWalletId: "653b3e6d4350fb0b69c9e8ab",
    copyTradeId: "6540761f81f0a92f14cd9048",
    copyTradeTitle: "HGGG",
    sourcePrice: 59.419727862,
    sourceTxHash:
      "0x9fe7c421bbb64dbc4c2623799e3fa9592d7cf9310e5d97798b3f571143f51e6f",
    isLong: true,
    isIncrease: true,
    isClose: false,
    copyPositionId: "6556920cf1ebfb1b1f3aece9",
    copyOrderId: "6556920cf1ebfb1b1f3aeceb",
    data: { volume: 50, leverage: 2, size: 0.05 },
  };

  const delayedOrders: { intentionTime: bigint; sizeDelta: bigint } = {
    intentionTime: BigInt(0),
    sizeDelta: BigInt(0),
  };

  const prices = { price: BigInt("2041578543960000000000") };

  const marginAccessible = { marginAccessible: BigInt("0") };
  const marginRemaining = { marginRemaining: BigInt("49999999999999999568") };

  const position = {
    id: BigInt("0"),
    lastFundingIndex: BigInt("0"),
    margin: BigInt("0"),
    lastPrice: BigInt("0"),
    size: parseEther("0.05").toBigInt(),
  };
  const price = BigNumber.from(prices.price);

  console.log(
    "delayedOrders",
    delayedOrders?.intentionTime?.toString(),
    delayedOrders?.sizeDelta?.toString()
  );
  console.log("prices", prices?.price?.toString());
  console.log(
    "marginAccessible",
    marginAccessible?.marginAccessible?.toString()
  );

  const commands: SYNTHETIX_FUNCTION_CODE[] = [];
  const inputs: any[] = [];

  if (delayedOrders.sizeDelta.toString() !== "0") {
    commands.push(SYNTHETIX_FUNCTION_CODE.PERP_CANCEL_ORDER);
    inputs.push(abi.encode(["address"], [doc.perpMarketAddress]));
  }

  const desiredFillPrice: BigNumber = calculateDesiredFillPrice(
    price,
    (doc.isLong && doc.isIncrease) || (!doc.isLong && !doc.isIncrease)
  );
  console.log("desiredFillPrice", desiredFillPrice?.toString());
  const placeOrderData = doc.data;

  if (BigNumber.from(marginAccessible.marginAccessible).gt(0)) {
    commands.push(SYNTHETIX_FUNCTION_CODE.PERP_WITHDRAW_ALL_MARGIN);
    inputs.push(abi.encode(["address"], [doc.perpMarketAddress]));
  }

  let qty: BigNumber;
  let margin: BigNumber;

  const lastMargin = BigNumber.from(marginRemaining?.marginRemaining ?? 0);
  console.log("lastMargin", lastMargin.toString());
  const lastSize = BigNumber.from(position.size ?? 0);
  console.log("lastSize", lastSize.toString());

  if (doc.isIncrease) {
    const amount: BigNumber = parseEther(placeOrderData.volume.toString());
    qty = amount
      .mul(BigNumber.from(10).pow(18))
      .div(price)
      .mul(placeOrderData.leverage)
      .mul(doc.isLong ? 1 : -1);

    margin = lastSize
      .abs()
      .mul(price)
      .div(BigNumber.from(10).pow(18))
      .div(placeOrderData.leverage)
      .add(amount);
  } else {
    qty = parseEther(placeOrderData.size.toString()).mul(!doc.isLong ? 1 : -1);
    margin = lastSize
      .add(qty)
      .abs()
      .mul(price)
      .div(BigNumber.from(10).pow(18))
      .div(placeOrderData.leverage);
  }

  console.log("qty", qty.toString());
  console.log("margin", margin.toString());

  if (doc.isIncrease && margin.gt(lastMargin)) {
    const marginDelta = margin.sub(lastMargin);
    commands.push(SYNTHETIX_FUNCTION_CODE.PERP_MODIFY_MARGIN);
    inputs.push(
      abi.encode(
        ["address", "int256"],
        [doc.perpMarketAddress, marginDelta.toString()]
      )
    );
    console.log("PERP_MODIFY_MARGIN", marginDelta.toString());
  }

  if (
    doc.isIncrease ||
    (qty.gte(0) ? qty.lte(lastSize.mul(-1)) : qty.mul(-1).lte(lastSize))
  ) {
    commands.push(SYNTHETIX_FUNCTION_CODE.PERP_SUBMIT_CREATE_ORDER);

    console.log("PERP_SUBMIT_CREATE_ORDER", qty, desiredFillPrice);
    inputs.push(
      abi.encode(
        ["address", "int256", "uint256"],
        [doc.perpMarketAddress, qty.toString(), desiredFillPrice.toString()]
      )
    );
  } else {
    commands.push(SYNTHETIX_FUNCTION_CODE.PERP_SUBMIT_CLOSE_ORDER);
    console.log("PERP_SUBMIT_CLOSE_ORDER", desiredFillPrice);
    inputs.push(
      abi.encode(
        ["address", "uint256"],
        [doc.perpMarketAddress, desiredFillPrice.toString()]
      )
    );
  }
  console.log(commands);
  console.log(inputs);
}

main();
