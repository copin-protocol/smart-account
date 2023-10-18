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
  let configs: Contract;
  let wallets: SignerWithAddress[];

  const fixture = async (wallets: SignerWithAddress[]) => {
    const { factory, configs, accountImplement } = await completeFixture(
      wallets
    );
    return { factory, configs, accountImplement };
  };

  before("create fixture loader", async () => {
    wallets = await ethers.getSigners();
    loadFixture = createFixtureLoader(wallets as any[]);
  });
  beforeEach("load fixture", async () => {
    ({ configs } = await loadFixture(fixture));
  });

  describe("CONSTRUCTOR", () => {
    it("factory", async () => {
      const owner = await configs.owner();
      expect(owner).to.equal(wallets[0].address);
    });
  });

  describe("setExecutorFee", () => {
    const newFee = ethers.utils.parseEther("1").div(1000);
    it("success", async () => {
      await configs.setExecutorFee(newFee);
      expect(await configs.executorFee()).to.equal(newFee);
    });

    it("emit event", async () => {
      const tx = await configs.setExecutorFee(newFee);
      await expect(tx).to.emit(configs, "ExecutorFeeSet").withArgs(newFee);
    });

    it("revert only owner", async () => {
      await expect(
        configs.connect(wallets[1]).setExecutorFee(newFee)
      ).to.be.revertedWith("UNAUTHORIZED");
    });
  });

  describe("setProtocolFee", () => {
    const newFee = 1000;
    it("success", async () => {
      await configs.setProtocolFee(newFee);
      expect(await configs.protocolFee()).to.equal(newFee);
    });

    it("emit event", async () => {
      const tx = await configs.setProtocolFee(newFee);
      await expect(tx).to.emit(configs, "ProtocolFeeSet").withArgs(newFee);
    });

    it("revert only owner", async () => {
      await expect(
        configs.connect(wallets[1]).setProtocolFee(newFee)
      ).to.be.revertedWith("UNAUTHORIZED");
    });
  });

  describe("setFeeReceiver", () => {
    it("success", async () => {
      await configs.setFeeReceiver(wallets[1].address);
      expect(await configs.feeReceiver()).to.equal(wallets[1].address);
    });

    it("emit event", async () => {
      const tx = await configs.setFeeReceiver(wallets[1].address);
      await expect(tx)
        .to.emit(configs, "FeeReceiverSet")
        .withArgs(wallets[1].address);
    });

    it("revert only owner", async () => {
      await expect(
        configs.connect(wallets[1]).setFeeReceiver(wallets[1].address)
      ).to.be.revertedWith("UNAUTHORIZED");
    });
  });
});
