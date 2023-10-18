import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

export enum AccountCommand {
  ACCOUNT_MODIFY_MARGIN = 0,
  ACCOUNT_WITHDRAW_ETH = 1,
  PERP_CANCEL_ORDER = 2,
  PERP_WITHDRAW_ALL_MARGIN = 3,
  PERP_MODIFY_MARGIN = 4,
  PERP_SUBMIT_CREATE_ORDER = 5,
  PERP_SUBMIT_CLOSE_ORDER = 6,
  DELEGATE_DEPOSIT_MARGIN = 7,
  DELEGATE_RELEASE_FEE = 8,
}

export const DEFAULT_FUNDS = ethers.utils.parseEther("100");

const abi = ethers.utils.defaultAbiCoder;

export const depositFunds = async ({
  funds = DEFAULT_FUNDS,
  account,
  marginAsset,
}: {
  funds?: BigNumber;
  account: Contract;
  marginAsset: Contract;
}) => {
  await marginAsset.approve(account.address, funds);
  await account.execute([0], [abi.encode(["int256"], [funds])]);
};

export const withdrawFunds = async ({
  funds = DEFAULT_FUNDS,
  account,
}: {
  funds?: BigNumber;
  account: Contract;
  marginAsset: Contract;
}) => {
  await account.execute([0], [abi.encode(["int256"], [funds.mul(-1)])]);
};
