import { expect } from "../utils/expect";
import { ethers, waffle } from "hardhat";
import { completeFixture } from "../utils/fixturesSNX";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, Event } from "ethers";
import { calculateDesiredFillPrice } from "../../utils/perps";
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

  beforeEach("create new account", async () => {
    const tx = await factory.newAccount(delegateWallet.address);
    const rc = await tx.wait(); // 0ms, as tx is already confirmed
    const event = rc.events.find(
      (event: Event) => event.event === "NewAccount"
    );
    const { account: newAccount } = event.args;
    account = new ethers.Contract(newAccount, accountAbi, wallets[0] as any);
  });

  beforeEach("deposit eth", async () => {
    await wallets[0].sendTransaction({
      to: account.address,
      value: ethers.utils.parseEther("10"),
    });
  });

  describe("CONSTRUCTOR", () => {
    it("factory", async () => {
      const eventFactory = await events.factory();
      expect(eventFactory).to.equal(factory.address);
    });
  });

  describe("EVENTS", () => {
    it("emit EthWithdraw", async () => {
      const tx = await account.execute(
        [1],
        [abi.encode(["uint256"], [ethers.utils.parseEther("2")])]
      );
      await expect(tx)
        .to.emit(events, "EthWithdraw")
        .withArgs(
          wallets[0].address,
          account.address,
          ethers.utils.parseEther("2")
        );
    });

    it("emit Deposit", async () => {
      await marginAsset.approve(
        account.address,
        ethers.utils.parseEther("100")
      );
      const tx = await account.execute(
        [0],
        [abi.encode(["int256"], [ethers.utils.parseEther("50")])]
      );
      await expect(tx)
        .to.emit(events, "Deposit")
        .withArgs(
          wallets[0].address,
          account.address,
          ethers.utils.parseEther("50")
        );
    });

    it("emit Withdraw", async () => {
      await marginAsset.approve(
        account.address,
        ethers.utils.parseEther("100")
      );
      await account.execute(
        [0],
        [abi.encode(["int256"], [ethers.utils.parseEther("50")])]
      );
      const tx = await account.execute(
        [0],
        [abi.encode(["int256"], [ethers.utils.parseEther("-50")])]
      );
      await expect(tx)
        .to.emit(events, "Withdraw")
        .withArgs(
          wallets[0].address,
          account.address,
          ethers.utils.parseEther("50")
        );
    });

    it("emit ChargeExecutorFee", async () => {
      const executorFee = await account.executorUsdFee();
      await marginAsset.approve(
        account.address,
        ethers.utils.parseEther("100")
      );
      const tx = await account
        .connect(delegateWallet)
        .execute(
          [7],
          [abi.encode(["uint256"], [ethers.utils.parseEther("10")])]
        );
      await expect(tx)
        .to.emit(events, "ChargeExecutorFee")
        .withArgs(
          delegateWallet.address,
          wallets[0].address,
          account.address,
          executorFee
        );
    });

    it("emit ChargeProtocolFee", async () => {
      const protocolFee = await configs.protocolFee();
      await marginAsset.approve(
        account.address,
        ethers.utils.parseEther("100")
      );

      const priceInfo = await marketETH.assetPrice();
      // sizeDelta positive
      let desiredFillPrice = calculateDesiredFillPrice(priceInfo.price, true);

      const size = ethers.utils
        .parseEther("100")
        .mul(ethers.BigNumber.from(10).pow(18))
        .div(desiredFillPrice);

      await account
        .connect(delegateWallet)
        .execute(
          [7, 4, 5],
          [
            abi.encode(["uint256"], [ethers.utils.parseEther("100")]),
            abi.encode(
              ["address", "int256"],
              [marketETH.address, ethers.utils.parseEther("50")]
            ),
            abi.encode(
              ["address", "int256", "uint256"],
              [marketETH.address, size, desiredFillPrice]
            ),
          ]
        );
      await marketETH.mockExecute(account.address);
      desiredFillPrice = calculateDesiredFillPrice(priceInfo.price, false);
      const tx = await account
        .connect(delegateWallet)
        .execute(
          [6],
          [
            abi.encode(
              ["address", "uint256"],
              [marketETH.address, desiredFillPrice]
            ),
          ]
        );
      await expect(tx)
        .to.emit(events, "ChargeProtocolFee")
        .withArgs(
          wallets[0].address,
          account.address,
          size.mul(priceInfo.price).div(ethers.utils.parseEther("1")),
          size
            .mul(priceInfo.price)
            .div(ethers.utils.parseEther("1"))
            .div(protocolFee)
        );
    });

    it("revered only accounts", async () => {
      await expect(
        events.emitEthWithdraw(wallets[0].address, ethers.utils.parseEther("2"))
      ).to.be.revertedWith("OnlyAccounts()");
    });
  });
});
