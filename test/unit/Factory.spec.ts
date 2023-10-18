import { expect } from "../utils/expect";
import { ethers, waffle } from "hardhat";
import { completeFixture } from "../utils/fixturesSNX";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, Event } from "ethers";
const {
  abi: accountAbi,
} = require("../../artifacts/contracts/Account.sol/Account.json");

const abi = ethers.utils.defaultAbiCoder;

describe("Events", () => {
  const createFixtureLoader = waffle.createFixtureLoader;
  let loadFixture: any;
  let factory: Contract;
  let events: Contract;
  let accountImplement: Contract;
  let account: Contract;
  let wallets: SignerWithAddress[];

  const fixture = async (wallets: SignerWithAddress[]) => {
    const { factory, events, accountImplement } = await completeFixture(
      wallets
    );
    return { factory, events, accountImplement };
  };

  before("create fixture loader", async () => {
    wallets = await ethers.getSigners();
    loadFixture = createFixtureLoader(wallets as any[]);
  });
  beforeEach("load fixture", async () => {
    ({ factory, events, accountImplement } = await loadFixture(fixture));
  });

  describe("CONSTRUCTOR", () => {
    it("owner", async () => {
      const owner = await factory.owner();
      expect(owner).to.equal(wallets[0].address);
    });
    it("canUpgrade", async () => {
      const canUpgrade = await factory.canUpgrade();
      expect(canUpgrade).to.equal(true);
    });
    it("implementation", async () => {
      const implementation = await factory.implementation();
      expect(accountImplement.address).to.equal(implementation);
    });
  });

  describe("OWNERSHIP", () => {
    it("factory transferOwnership", async () => {
      await factory.transferOwnership(wallets[1].address);
      expect(await factory.owner()).to.equal(wallets[1].address);
    });
    it("factory ownership non-account", async () => {
      await expect(
        factory.getAccountOwner(ethers.constants.AddressZero)
      ).to.be.revertedWith("AccountDoesNotExist()");
    });
  });

  describe("newAccount", () => {
    it("event", async () => {
      const tx = await factory.newAccount(ethers.constants.AddressZero);
      expect(tx).to.emit(factory, "NewAccount");
      const rc = await tx.wait(); // 0ms, as tx is already confirmed
      const event = rc.events.find(
        (event: Event) => event.event === "NewAccount"
      );
      const { creator, version } = event.args;
      expect(creator).is.equal(wallets[0].address);
      expect(version).is.equal(ethers.utils.formatBytes32String("0.1.0"));
    });
    it("is exist", async () => {
      const tx = await factory.newAccount(ethers.constants.AddressZero);
      const rc = await tx.wait(); // 0ms, as tx is already confirmed
      const event = rc.events.find(
        (event: Event) => event.event === "NewAccount"
      );
      const { account } = event.args;
      expect(await factory.accounts(account)).to.equal(true);
    });
    it("multiple", async () => {
      const tx1 = await factory.newAccount(ethers.constants.AddressZero);
      const rc1 = await tx1.wait(); // 0ms, as tx is already confirmed
      const event1 = rc1.events.find(
        (event: Event) => event.event === "NewAccount"
      );
      const { account: account1 } = event1.args;
      const tx2 = await factory.newAccount(ethers.constants.AddressZero);
      const rc2 = await tx2.wait(); // 0ms, as tx is already confirmed
      const event2 = rc2.events.find(
        (event: Event) => event.event === "NewAccount"
      );
      const { account: account2 } = event2.args;
      expect(await factory.getAccountOwner(account1)).to.equal(
        await factory.getAccountOwner(account2)
      );
    });
    it("revert cannot be initialized", async () => {
      const MockAccount1 = await ethers.getContractFactory("MockAccount1");
      const mockAccount1 = await MockAccount1.deploy();
      await factory.upgradeAccountImplementation(mockAccount1.address);
      await expect(
        factory.newAccount(ethers.constants.AddressZero)
      ).to.be.revertedWith(`FailedToSetAccountOwner("0x")`);
    });
    it("revert cannot add delegate", async () => {
      const MockAccount2 = await ethers.getContractFactory("MockAccount2");
      const mockAccount2 = await MockAccount2.deploy();
      await factory.upgradeAccountImplementation(mockAccount2.address);
      await expect(factory.newAccount(wallets[0].address)).to.be.revertedWith(
        `FailedToAddAccountDelegate("0x")`
      );
    });
    it("revert cannot get version", async () => {
      const MockAccount2 = await ethers.getContractFactory("MockAccount2");
      const mockAccount2 = await MockAccount2.deploy();
      await factory.upgradeAccountImplementation(mockAccount2.address);
      await expect(
        factory.newAccount(ethers.constants.AddressZero)
      ).to.be.revertedWith(`AccountFailedToFetchVersion("0x")`);
    });
  });
  describe("removeUpgradability", () => {
    it("revert unauthorized", async () => {
      await expect(
        factory.connect(wallets[1]).removeUpgradability()
      ).revertedWith("UNAUTHORIZED");
    });
    it("revert unauthorized", async () => {
      await factory.removeUpgradability();
      expect(await factory.canUpgrade()).to.equal(false);
    });
  });
  describe("upgradeAccountImplementation", () => {
    it("revert unauthorized", async () => {
      await expect(
        factory
          .connect(wallets[1])
          .upgradeAccountImplementation(ethers.constants.AddressZero)
      ).revertedWith("UNAUTHORIZED");
    });
    it("success", async () => {
      const tx = await factory.newAccount(ethers.constants.AddressZero);
      const rc = await tx.wait(); // 0ms, as tx is already confirmed
      const event = rc.events.find(
        (event: Event) => event.event === "NewAccount"
      );
      const { account: newAccount } = event.args;
      account = new ethers.Contract(newAccount, accountAbi, wallets[0] as any);
      await account.transferOwnership(wallets[2].address);
      const MockUpgradedAccount = await ethers.getContractFactory(
        "MockUpgradedAccount"
      );
      const mockUpgradedAccount = await MockUpgradedAccount.deploy();
      await factory.upgradeAccountImplementation(mockUpgradedAccount.address);
      expect(await account.VERSION()).to.equal(
        ethers.utils.formatBytes32String("9.9.9")
      );
      expect(await account.owner()).to.equal(wallets[2].address);
    });
    it("emit event", async () => {
      const MockUpgradedAccount = await ethers.getContractFactory(
        "MockUpgradedAccount"
      );
      const mockUpgradedAccount = await MockUpgradedAccount.deploy();
      const tx = await factory.upgradeAccountImplementation(
        mockUpgradedAccount.address
      );
      await expect(tx)
        .to.emit(factory, "AccountImplementationUpgraded")
        .withArgs(mockUpgradedAccount.address);
    });

    it("revert cannot upgraded", async () => {
      await factory.removeUpgradability();
      await expect(
        factory.upgradeAccountImplementation(ethers.constants.AddressZero)
      ).to.be.revertedWith("CannotUpgrade()");
    });
  });
});
