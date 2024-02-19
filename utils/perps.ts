import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { PROTOCOL_FEE } from "./constants";
import { AccountCommand } from "./accounts";
import { formatEther } from "@ethersproject/units";

const abi = ethers.utils.defaultAbiCoder;

// ACCOUNT_MODIFY_MARGIN, //0
// ACCOUNT_WITHDRAW_ETH, //1
// PERP_CANCEL_ORDER, //2
// PERP_WITHDRAW_ALL_MARGIN, //3
// PERP_MODIFY_MARGIN, //4
// PERP_SUBMIT_CREATE_ORDER, //5
// PERP_SUBMIT_CLOSE_ORDER //6
// DELEGATE_DEPOSIT_MARGIN //7

export const calculateDesiredFillPrice = (
  marketPrice: BigNumber,
  sizeDeltaPos: boolean
) => {
  const oneBN = ethers.utils.parseEther("1");
  const priceImpactDecimalPct = oneBN.div(100);
  return sizeDeltaPos
    ? marketPrice.mul(priceImpactDecimalPct.add(oneBN)).div(oneBN)
    : marketPrice.mul(oneBN.sub(priceImpactDecimalPct)).div(oneBN);
};

export const DEFAULT_AMOUNT = ethers.utils.parseEther("50");

export async function placeOrder({
  account,
  market,
  markets,
  amount = DEFAULT_AMOUNT,
  isLong = true,
  increase = true,
}: {
  account: Contract;
  market: Contract;
  markets: Contract[];
  amount?: BigNumber;
  isLong?: boolean;
  increase?: boolean;
}) {
  const leverage = ethers.BigNumber.from(2);
  const size = amount.mul(leverage);
  const sign = isLong === increase ? 1 : -1;
  const executorFee = await account.executorUsdFee(
    ethers.utils.parseEther("1").div(5000)
  );
  const protocolFee = PROTOCOL_FEE;
  const amountWithFee = amount.add(size.div(protocolFee)).add(executorFee);

  console.log("111");

  const availableMargin = await account.availableMargin();

  // console.log("availableMargin", ethers.utils.formatEther(availableMargin));
  // console.log("accessibleMargin", ethers.utils.formatEther(marginAccessible));

  const commands = [];
  const inputs = [];

  const delayedOrder = await market.delayedOrders(account.address);
  // console.log(delayedOrder.sizeDelta);
  if (Number(ethers.utils.formatEther(delayedOrder.sizeDelta)) !== 0) {
    commands.push(AccountCommand.PERP_CANCEL_ORDER);
    inputs.push(abi.encode(["address"], [market.address]));
  }

  let accessibleMargins = BigNumber.from(0);

  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    const order = await m.delayedOrders(account.address);
    if (
      m.address === market.address ||
      !order ||
      (order.sizeDelta as BigNumber).eq(0)
    ) {
      const { marginAccessible } = await m.accessibleMargin(account.address);
      console.log("m", m.address);
      console.log("m", await m.marketKey());
      console.log("marginAccessible", formatEther(marginAccessible));
      if (marginAccessible.gt(0)) {
        accessibleMargins = accessibleMargins.add(marginAccessible);
        commands.push(AccountCommand.PERP_WITHDRAW_ALL_MARGIN);
        inputs.push(abi.encode(["address"], [m.address]));
      }
    }
  }

  console.log("accessibleMargins", formatEther(accessibleMargins));

  if (increase) {
    const requiredDeposit = amountWithFee
      .sub(availableMargin)
      .sub(accessibleMargins);

    // console.log("requiredDeposit", ethers.utils.formatEther(requiredDeposit));

    if (requiredDeposit.gt(0)) {
      throw Error("Insufficient funds");
    }
  }

  const priceInfo = await market.assetPrice();
  // sizeDelta positive
  const desiredFillPrice = calculateDesiredFillPrice(
    priceInfo.price,
    Number(ethers.utils.formatEther(amount)) / sign > 0
  );

  console.log("price", ethers.utils.formatEther(priceInfo.price));
  console.log("desiredFillPrice", ethers.utils.formatEther(desiredFillPrice));

  const sizeDelta = size
    .mul(ethers.BigNumber.from(10).pow(18))
    .div(desiredFillPrice)
    .mul(sign);

  if (increase) {
    commands.push(AccountCommand.PERP_MODIFY_MARGIN);
    inputs.push(abi.encode(["address", "int256"], [market.address, amount]));
  }
  commands.push(AccountCommand.PERP_SUBMIT_CREATE_ORDER);
  inputs.push(
    abi.encode(
      ["address", "int256", "uint256"],
      [market.address, sizeDelta, desiredFillPrice]
    )
  );
  // if (!increase) {
  //   commands.push(AccountCommand.PERP_MODIFY_MARGIN);
  //   inputs.push(
  //     abi.encode(["address", "int256"], [market.address, amount.mul(-1)])
  //   );
  // }
  return {
    commands,
    inputs,
    sizeDelta,
    price: priceInfo.price,
    desiredFillPrice,
  };
}

export async function closeOrder({
  account,
  market,
}: {
  account: Contract;
  market: Contract;
  isLong?: boolean;
}) {
  const priceInfo = await market.assetPrice();
  const positions = await market.positions(account.address);
  // if (positions.size == 0) throw Error("no opening position");
  // sizeDelta negative
  const desiredFillPrice = calculateDesiredFillPrice(
    priceInfo.price,
    positions.size.gt(0) ? false : true
  );

  const commands = [];
  const inputs = [];

  const delayedOrder = await market.delayedOrders(account.address);

  if (Number(ethers.utils.formatEther(delayedOrder.sizeDelta)) !== 0) {
    commands.push(AccountCommand.PERP_CANCEL_ORDER);
    inputs.push(abi.encode(["address"], [market.address]));
  }

  // console.log("positions", positions.size);

  const { marginAccessible } = await market.accessibleMargin(account.address);

  // console.log(
  //   "accessibleMargin close",
  //   ethers.utils.formatEther(marginAccessible)
  // );

  if (marginAccessible.gt(0)) {
    commands.push(AccountCommand.PERP_WITHDRAW_ALL_MARGIN);
    inputs.push(abi.encode(["address"], [market.address]));
  }

  commands.push(AccountCommand.PERP_SUBMIT_CLOSE_ORDER);
  inputs.push(
    abi.encode(["address", "uint256"], [market.address, desiredFillPrice])
  );
  return {
    commands,
    inputs,
    sizeDelta: positions.size.mul(-1),
    desiredFillPrice,
    price: priceInfo.price,
  };
}

export async function withdrawAllFunds({
  account,
  market,
}: {
  account: Contract;
  market: Contract;
}) {
  const availableMargin = await account.availableMargin();

  const { marginAccessible } = await market.accessibleMargin(account.address);

  // console.log("availableMargin", ethers.utils.formatEther(availableMargin));
  // console.log("accessibleMargin", ethers.utils.formatEther(marginAccessible));

  const commands = [];
  const inputs = [];

  if (marginAccessible.gt(0)) {
    commands.push(AccountCommand.PERP_WITHDRAW_ALL_MARGIN);
    inputs.push(abi.encode(["address"], [market.address]));
  }

  // const funds = availableMargin.add(marginAccessible).mul(-1);

  // commands.push(AccountCommand.ACCOUNT_MODIFY_MARGIN);
  // inputs.push(abi.encode(["int256"], [funds]));

  return {
    commands,
    inputs,
  };
}
