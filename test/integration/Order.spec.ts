import { expect } from "../utils/expect";
import { ethers, waffle } from "hardhat";
import { completeFixture } from "../utils/fixturesSNX";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Contract, Event } from "ethers";
import {
  DEFAULT_AMOUNT,
  calculateDesiredFillPrice,
  closeOrder,
  placeOrder,
} from "../../utils/perps";
import { AccountCommand, depositFunds } from "../../utils/accounts";
const {
  abi: accountAbi,
} = require("../../artifacts/contracts/Account.sol/Account.json");

const abi = ethers.utils.defaultAbiCoder;

describe("Events", () => {
  const createFixtureLoader = waffle.createFixtureLoader;
  let loadFixture: any;
  let factory: Contract;
  let events: Contract;
  let configs: Contract;
  let marginAsset: Contract;
  let perps: Contract[];
  let marketETH: Contract;
  let accountImplement: Contract;
  let account: Contract;
  let wallets: SignerWithAddress[];
  let delegateWallet: SignerWithAddress;

  const fixture = async (wallets: SignerWithAddress[]) => {
    const {
      factory,
      events,
      configs,
      marginAsset,
      perps,
      marketETH,
      accountImplement,
    } = await completeFixture(wallets);
    return {
      factory,
      events,
      configs,
      marginAsset,
      perps,
      marketETH,
      accountImplement,
    };
  };

  before("create fixture loader", async () => {
    wallets = await ethers.getSigners();
    delegateWallet = wallets[2];
    loadFixture = createFixtureLoader(wallets as any[]);
  });
  beforeEach("load fixture", async () => {
    ({
      factory,
      events,
      configs,
      marginAsset,
      perps,
      marketETH,
      accountImplement,
    } = await loadFixture(fixture));
  });

  beforeEach("create new account and deposit funds", async () => {
    const tx = await factory.newAccount(delegateWallet.address);
    const rc = await tx.wait(); // 0ms, as tx is already confirmed
    const event = rc.events.find(
      (event: Event) => event.event === "NewAccount"
    );
    const { account: newAccount } = event.args;
    account = new ethers.Contract(newAccount, accountAbi, wallets[0] as any);
    await depositFunds({
      account,
      marginAsset,
    });
  });

  describe("createOrder", () => {
    it("LONG no delayed orders", async () => {
      const { commands, inputs, sizeDelta, desiredFillPrice, price } =
        await placeOrder({
          account,
          market: marketETH,
        });
      expect(commands).to.deep.equal([
        AccountCommand.PERP_MODIFY_MARGIN,
        AccountCommand.PERP_SUBMIT_CREATE_ORDER,
      ]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9000000000000000000000000000000000000000000000002b5e3af16b1880000",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000000000afe07d7ce1772000000000000000000000000000000000000000000000006d8121a194d1100000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).to.equal(sizeDelta);
      expect(delayedOrder.sizeDelta).gt(0);
      expect(delayedOrder.desiredFillPrice).to.equal(desiredFillPrice);
      expect(delayedOrder.trackingCode).to.equal(
        ethers.utils.formatBytes32String("COPIN")
      );
      expect(delayedOrder.desiredFillPrice).to.gt(price);
      // await marketETH.mockPosition(account.address, {
      //   id: 1,
      //   lastFundingIndex: 1,
      //   margin: amount,
      //   lastPrice: price,
      //   size: sizeDelta,
      // });
    });
    it("SHORT no delayed orders", async () => {
      const { commands, inputs, sizeDelta, desiredFillPrice, price } =
        await placeOrder({
          account,
          market: marketETH,
          isLong: false,
        });
      expect(commands).to.deep.equal([
        AccountCommand.PERP_MODIFY_MARGIN,
        AccountCommand.PERP_SUBMIT_CREATE_ORDER,
      ]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9000000000000000000000000000000000000000000000002b5e3af16b1880000",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9ffffffffffffffffffffffffffffffffffffffffffffffffff4c91ec9548867700000000000000000000000000000000000000000000006b56051582a9700000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).to.equal(sizeDelta);
      expect(delayedOrder.sizeDelta).lt(0);
      expect(delayedOrder.desiredFillPrice).to.equal(desiredFillPrice);
      expect(delayedOrder.desiredFillPrice).to.lt(price);
    });
    it("having delayed orders", async () => {
      const { commands: prevCommands, inputs: prevInputs } = await placeOrder({
        account,
        market: marketETH,
      });
      await account.connect(delegateWallet).execute(prevCommands, prevInputs);
      const { commands, inputs, price } = await placeOrder({
        account,
        market: marketETH,
      });
      expect(commands).to.deep.equal([
        AccountCommand.PERP_CANCEL_ORDER,
        AccountCommand.PERP_WITHDRAW_ALL_MARGIN,
        AccountCommand.PERP_MODIFY_MARGIN,
        AccountCommand.PERP_SUBMIT_CREATE_ORDER,
      ]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9000000000000000000000000000000000000000000000002b5e3af16b1880000",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000000000afe07d7ce1772000000000000000000000000000000000000000000000006d8121a194d1100000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.desiredFillPrice).to.gt(price);
      // await marketETH.mockPosition(account.address, {
      //   id: 1,
      //   lastFundingIndex: 1,
      //   margin: amount,
      //   lastPrice: price,
      //   size: sizeDelta,
      // });
    });
    it("having perp margin", async () => {
      await marketETH.mockAccessibleMargin(account.address, DEFAULT_AMOUNT);
      const { commands, inputs, price } = await placeOrder({
        account,
        market: marketETH,
      });
      expect(commands).to.deep.equal([
        AccountCommand.PERP_WITHDRAW_ALL_MARGIN,
        AccountCommand.PERP_MODIFY_MARGIN,
        AccountCommand.PERP_SUBMIT_CREATE_ORDER,
      ]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9000000000000000000000000000000000000000000000002b5e3af16b1880000",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000000000afe07d7ce1772000000000000000000000000000000000000000000000006d8121a194d1100000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.desiredFillPrice).to.gt(price);
    });
    it("increase order", async () => {
      const { commands: prevCommands, inputs: prevInputs } = await placeOrder({
        account,
        market: marketETH,
      });
      await account.connect(delegateWallet).execute(prevCommands, prevInputs);
      await marketETH.mockExecute(account.address);
      const { commands, inputs, price } = await placeOrder({
        account,
        market: marketETH,
        amount: ethers.utils.parseEther("25"),
      });
      expect(commands).to.deep.equal([
        AccountCommand.PERP_MODIFY_MARGIN,
        AccountCommand.PERP_SUBMIT_CREATE_ORDER,
      ]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc90000000000000000000000000000000000000000000000015af1d78b58c40000",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc90000000000000000000000000000000000000000000000000057f03ebe70bb9000000000000000000000000000000000000000000000006d8121a194d1100000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).gt(0);
      expect(delayedOrder.desiredFillPrice).to.gt(price);
    });
    it("decrease order", async () => {
      const { commands: prevCommands, inputs: prevInputs } = await placeOrder({
        account,
        market: marketETH,
      });
      await account.connect(delegateWallet).execute(prevCommands, prevInputs);
      await marketETH.mockExecute(account.address);
      const { commands, inputs, price } = await placeOrder({
        account,
        market: marketETH,
        amount: ethers.utils.parseEther("25"),
        increase: false,
      });
      expect(commands).to.deep.equal([AccountCommand.PERP_SUBMIT_CREATE_ORDER]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9ffffffffffffffffffffffffffffffffffffffffffffffffffa648f64aa4433c00000000000000000000000000000000000000000000006b56051582a9700000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).lt(0);
      expect(delayedOrder.desiredFillPrice).to.lt(price);
    });
  });
  describe("closeOrder", () => {
    it("close LONG", async () => {
      const { commands: createdCommands, inputs: createdInputs } =
        await placeOrder({
          account,
          market: marketETH,
        });
      await account
        .connect(delegateWallet)
        .execute(createdCommands, createdInputs);
      await marketETH.mockExecute(account.address);
      const { commands, inputs, price, sizeDelta, desiredFillPrice } =
        await closeOrder({
          account,
          market: marketETH,
        });
      expect(commands).to.deep.equal([AccountCommand.PERP_SUBMIT_CLOSE_ORDER]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000006b56051582a9700000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).to.equal(sizeDelta);
      expect(delayedOrder.sizeDelta).lt(0);
      expect(delayedOrder.desiredFillPrice).to.equal(desiredFillPrice);
      expect(delayedOrder.trackingCode).to.equal(
        ethers.utils.formatBytes32String("COPIN")
      );
      expect(delayedOrder.desiredFillPrice).to.lt(price);
    });
    it("close SHORT", async () => {
      const { commands: createdCommands, inputs: createdInputs } =
        await placeOrder({
          account,
          market: marketETH,
          isLong: false,
        });
      await account
        .connect(delegateWallet)
        .execute(createdCommands, createdInputs);
      await marketETH.mockExecute(account.address);
      const { commands, inputs, price, sizeDelta, desiredFillPrice } =
        await closeOrder({
          account,
          market: marketETH,
        });
      expect(commands).to.deep.equal([AccountCommand.PERP_SUBMIT_CLOSE_ORDER]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000006d8121a194d1100000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).to.equal(sizeDelta);
      expect(delayedOrder.sizeDelta).gt(0);
      expect(delayedOrder.desiredFillPrice).to.equal(desiredFillPrice);
      expect(delayedOrder.desiredFillPrice).to.gt(price);
    });

    it("having delayed orders", async () => {
      const { commands: createdCommands, inputs: createdInputs } =
        await placeOrder({
          account,
          market: marketETH,
        });
      await account
        .connect(delegateWallet)
        .execute(createdCommands, createdInputs);
      await marketETH.mockExecute(account.address);
      const { commands: prevCommands, inputs: prevInputs } = await closeOrder({
        account,
        market: marketETH,
      });
      await account.connect(delegateWallet).execute(prevCommands, prevInputs);
      const { commands, inputs, price } = await closeOrder({
        account,
        market: marketETH,
      });
      expect(commands).to.deep.equal([
        AccountCommand.PERP_CANCEL_ORDER,
        AccountCommand.PERP_SUBMIT_CLOSE_ORDER,
      ]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000006b56051582a9700000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.desiredFillPrice).to.lt(price);
    });
    it("having perp margin", async () => {
      const { commands: createdCommands, inputs: createdInputs } =
        await placeOrder({
          account,
          market: marketETH,
        });
      await account
        .connect(delegateWallet)
        .execute(createdCommands, createdInputs);
      await marketETH.mockExecute(account.address);
      await marketETH.mockAccessibleMargin(account.address, DEFAULT_AMOUNT);
      const { commands, inputs, price } = await closeOrder({
        account,
        market: marketETH,
      });
      expect(commands).to.deep.equal([
        AccountCommand.PERP_WITHDRAW_ALL_MARGIN,
        AccountCommand.PERP_SUBMIT_CLOSE_ORDER,
      ]);
      // expect(inputs).to.deep.equal([
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
      //   "0x000000000000000000000000cf7ed3acca5a467e9e704c703e8d87f634fb0fc900000000000000000000000000000000000000000000006b56051582a9700000",
      // ]);
      await account.connect(delegateWallet).execute(commands, inputs);
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.desiredFillPrice).to.lt(price);
    });
    it("revert no position", async () => {
      const { commands, inputs } = await closeOrder({
        account,
        market: marketETH,
      });
      await expect(account.connect(delegateWallet).execute(commands, inputs)).to
        .be.reverted;
    });
  });
  describe("cancelOrder", () => {
    it("cancel create", async () => {
      const { commands: createdCommands, inputs: createdInputs } =
        await placeOrder({
          account,
          market: marketETH,
        });
      await account
        .connect(delegateWallet)
        .execute(createdCommands, createdInputs);

      await account
        .connect(delegateWallet)
        .execute(
          [AccountCommand.PERP_CANCEL_ORDER],
          [abi.encode(["address"], [marketETH.address])]
        );
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).eq(0);
    });
    it("cancel close", async () => {
      const { commands: createdCommands, inputs: createdInputs } =
        await placeOrder({
          account,
          market: marketETH,
        });
      await account
        .connect(delegateWallet)
        .execute(createdCommands, createdInputs);
      await marketETH.mockExecute(account.address);
      const { commands: closedCommands, inputs: closedInputs } =
        await placeOrder({
          account,
          market: marketETH,
        });
      await account
        .connect(delegateWallet)
        .execute(closedCommands, closedInputs);
      await account
        .connect(delegateWallet)
        .execute(
          [AccountCommand.PERP_CANCEL_ORDER],
          [abi.encode(["address"], [marketETH.address])]
        );
      const delayedOrder = await marketETH.delayedOrders(account.address);
      expect(delayedOrder.sizeDelta).eq(0);
    });
    it("revert no delayed order", async () => {
      const { commands: createdCommands, inputs: createdInputs } =
        await placeOrder({
          account,
          market: marketETH,
        });
      await account
        .connect(delegateWallet)
        .execute(createdCommands, createdInputs);
      await marketETH.mockExecute(account.address);
      await expect(
        account
          .connect(delegateWallet)
          .execute(
            [AccountCommand.PERP_CANCEL_ORDER],
            [abi.encode(["address"], [marketETH.address])]
          )
      ).to.be.reverted;
    });
  });
});
