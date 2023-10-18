import { expect } from "../utils/expect";
import { ethers, waffle } from "hardhat";
import { completeFixture } from "../utils/fixturesSNX";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, Event } from "ethers";
import { abi as accountAbi } from "../../artifacts/contracts/Account.sol/Account.json";

const abi = ethers.utils.defaultAbiCoder;

describe("Account", () => {
  const createFixtureLoader = waffle.createFixtureLoader;
  let loadFixture: any;
  let marginAsset: Contract;
  let perps: Contract[];
  let factory: Contract;
  let events: Contract;
  let account: Contract;
  let accountImplement: Contract;
  let wallets: SignerWithAddress[];

  const fixture = async (wallets: SignerWithAddress[]) => {
    const { marginAsset, perps, factory, events, accountImplement } =
      await completeFixture(wallets);
    return {
      marginAsset,
      perps,
      factory,
      events,
      accountImplement,
    };
  };

  before("create fixture loader", async () => {
    wallets = await ethers.getSigners();
    loadFixture = createFixtureLoader(wallets as any[]);
  });
  beforeEach("load fixture", async () => {
    ({ marginAsset, perps, factory, events, accountImplement } =
      await loadFixture(fixture));
  });

  beforeEach("create new account", async () => {
    const tx = await factory.newAccount(ethers.constants.AddressZero);
    const rc = await tx.wait(); // 0ms, as tx is already confirmed
    const event = rc.events.find(
      (event: Event) => event.event === "NewAccount"
    );
    const { account: newAccount } = event.args;
    account = new ethers.Contract(newAccount, accountAbi, wallets[0] as any);
  });

  describe("VIEWS", () => {
    it("version", async () => {
      const version = await account.VERSION();
      expect(ethers.utils.parseBytes32String(version)).to.equal("0.1.0");
    });
    it("lockedMargin", async () => {
      const lockedMargin = await account.lockedMargin();
      expect(lockedMargin).to.equal(0);
    });
    it("availableMargin", async () => {
      const availableMargin = await account.availableMargin();
      expect(availableMargin).to.equal(0);
    });
  });

  describe("OWNERSHIP", () => {
    it("transferOwnership", async () => {
      const originalOwner = await factory.getAccountOwner(account.address);
      expect(originalOwner).to.equal(wallets[0].address);
      expect((await factory.getAccountsOwnedBy(originalOwner))[0]).to.equal(
        account.address
      );

      await account.transferOwnership(wallets[1].address);
      expect(await account.owner()).to.equal(wallets[1].address);

      const newOwner = await factory.getAccountOwner(account.address);
      expect(newOwner).to.equal(wallets[1].address);
      expect(
        (await factory.getAccountsOwnedBy(wallets[1].address))[0]
      ).to.equal(account.address);
      expect(
        (await factory.getAccountsOwnedBy(wallets[0].address)).length
      ).to.equal(0);
    });
    it("emit", async () => {
      await expect(account.transferOwnership(wallets[1].address))
        .to.be.emit(account, "OwnershipTransferred")
        .withArgs(wallets[0].address, wallets[1].address);
    });
    it("only factory can set initial ownership", async () => {
      await expect(
        account.setInitialOwnership(wallets[1].address)
      ).to.be.revertedWith("Unauthorized()");
    });
  });

  describe("DELEGATION", () => {
    let delegate: SignerWithAddress;
    let other: SignerWithAddress;
    beforeEach(() => {
      delegate = wallets[2];
      other = wallets[3];
    });
    it("addDelegate", async () => {
      await account.addDelegate(delegate.address);
      expect(await account.delegates(delegate.address)).to.be.equal(true);
    });
    it("addDelegate emit", async () => {
      await expect(account.addDelegate(delegate.address))
        .to.be.emit(account, "DelegatedAccountAdded")
        .withArgs(wallets[0].address, delegate.address);
    });
    it("addDelegate reverted not owner", async () => {
      await account.transferOwnership(wallets[1].address);
      await expect(account.addDelegate(delegate.address)).to.be.revertedWith(
        "Unauthorized()"
      );
    });
    it("addDelegate reverted zero address", async () => {
      await expect(
        account.addDelegate(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        `InvalidDelegateAddress("${ethers.constants.AddressZero}")`
      );
    });
    it("addDelegate reverted already set", async () => {
      await account.addDelegate(delegate.address);
      await expect(account.addDelegate(delegate.address)).to.be.revertedWith(
        `InvalidDelegateAddress("${delegate.address}")`
      );
    });

    it("addDelegate reverted set ownership", async () => {
      await account.addDelegate(delegate.address);
      await expect(
        account.connect(delegate as any).transferOwnership(wallets[2].address)
      ).to.be.revertedWith(`Unauthorized()`);
    });

    it("removeDelegate", async () => {
      await account.addDelegate(delegate.address);
      await account.removeDelegate(delegate.address);
      expect(await account.delegates(delegate.address)).to.be.equal(false);
    });
    it("removeDelegate emit", async () => {
      await account.addDelegate(delegate.address);
      await expect(account.removeDelegate(delegate.address))
        .to.be.emit(account, "DelegatedAccountRemoved")
        .withArgs(wallets[0].address, delegate.address);
    });
    it("removeDelegate reverted not owner", async () => {
      await account.addDelegate(delegate.address);
      await account.transferOwnership(wallets[1].address);
      await expect(account.removeDelegate(delegate.address)).to.be.revertedWith(
        "Unauthorized()"
      );
    });
    it("removeDelegate reverted zero address", async () => {
      await account.addDelegate(delegate.address);
      await expect(
        account.removeDelegate(ethers.constants.AddressZero)
      ).to.be.revertedWith(
        `InvalidDelegateAddress("${ethers.constants.AddressZero}")`
      );
    });
    it("removeDelegate reverted not delegate", async () => {
      await account.addDelegate(delegate.address);
      await expect(account.removeDelegate(other.address)).to.be.revertedWith(
        `InvalidDelegateAddress("${other.address}")`
      );
    });
  });

  describe("DISPATCH", () => {
    it("dispatch reverted invalid command", async () => {
      await expect(
        account.execute(
          [9],
          [abi.encode(["uint256"], [ethers.utils.parseEther("0.1")])]
        )
      ).to.be.reverted;
    });
    it("dispatch reverted invalid input", async () => {
      await expect(
        account.execute([1], [abi.encode(["address"], [wallets[0].address])])
      ).to.be.reverted;
    });
    it("dispatch reverted mismatch", async () => {
      await expect(
        account.execute([1, 2], [abi.encode(["address"], [wallets[0].address])])
      ).to.be.revertedWith(`LengthMismatch()`);
      await expect(
        account.execute(
          [1],
          [
            abi.encode(["uint256"], [ethers.utils.parseEther("0.1")]),
            abi.encode(["uint256"], [ethers.utils.parseEther("0.1")]),
          ]
        )
      ).to.be.revertedWith(`LengthMismatch()`);
    });
  });

  describe("DEPOSIT", () => {
    it("can deposit ETH", async () => {
      await wallets[3].sendTransaction({
        to: account.address,
        value: ethers.utils.parseEther("1"),
      });
      expect(await ethers.provider.getBalance(account.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
  });

  describe("withdrawETH", () => {
    it("success", async () => {
      await wallets[0].sendTransaction({
        to: account.address,
        value: ethers.utils.parseEther("10"),
      });
      const beforeBalance = await wallets[0].getBalance();
      await account.execute(
        [1],
        [abi.encode(["uint256"], [ethers.utils.parseEther("2")])]
      );
      expect(
        Number(
          ethers.utils.formatEther(
            beforeBalance.add(ethers.utils.parseEther("2"))
          )
        ).toFixed(2)
      ).to.equal(
        Number(ethers.utils.formatEther(await wallets[0].getBalance())).toFixed(
          2
        )
      );
      expect(await ethers.provider.getBalance(account.address)).to.equal(
        ethers.utils.parseEther("8")
      );
    });
    it("reverted only owner", async () => {
      await wallets[0].sendTransaction({
        to: account.address,
        value: ethers.utils.parseEther("10"),
      });
      await account.addDelegate(wallets[3].address);
      await expect(
        account
          .connect(wallets[3] as any)
          .execute(
            [1],
            [abi.encode(["uint256"], [ethers.utils.parseEther("2")])]
          )
      ).to.be.revertedWith("Unauthorized()");

      await account.transferOwnership(wallets[1].address);
      await expect(
        account.execute(
          [1],
          [abi.encode(["uint256"], [ethers.utils.parseEther("2")])]
        )
      ).to.be.revertedWith("Unauthorized()");
    });
  });
});
