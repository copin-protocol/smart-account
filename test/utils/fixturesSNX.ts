import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
// async function v3CoreFactoryFixture([wallet]) {
//   return await waffle.deployContract(wallet, {
//     bytecode: FACTORY_BYTECODE,
//     abi: FACTORY_ABI,
//   });
// }

export async function completeFixture([wallet]: SignerWithAddress[]) {
  const MarginAsset = await ethers.getContractFactory("MarginAsset");
  const ExchangeRate = await ethers.getContractFactory("MockSNXExchangeRate");
  const MarketManager = await ethers.getContractFactory("MockSNXMarketManager");
  const SystemStatus = await ethers.getContractFactory("MockSNXSystemStatus");
  const MarketETH = await ethers.getContractFactory("MockSNXMarketETH");
  const Factory = await ethers.getContractFactory("Factory");
  const Events = await ethers.getContractFactory("Events");
  const Configs = await ethers.getContractFactory("Configs");
  const TrustedForwarder = await ethers.getContractFactory(
    "MockTrustedForwarder"
  );
  const Account = await ethers.getContractFactory("AccountSNX");

  const marginAsset = await MarginAsset.deploy(
    ethers.constants.MaxUint256.div(2)
  );
  const exchangeRate = await ExchangeRate.deploy();
  const marketManager = await MarketManager.deploy();
  const systemStatus = await SystemStatus.deploy();
  const marketETH = await MarketETH.deploy(marginAsset.address);
  await marketManager.addMarket(marketETH.address);
  const factory = await Factory.deploy(wallet.address);
  const events = await Events.deploy(factory.address);
  const configs = await Configs.deploy(wallet.address);
  const trustedForwarder = await TrustedForwarder.deploy();
  const accountImplement = await Account.deploy({
    factory: factory.address,
    events: events.address,
    configs: configs.address,
    marginAsset: marginAsset.address,
    trustedForwarder: trustedForwarder.address,
    gelato: "0xF82D64357D9120a760e1E4C75f646C0618eFc2F3",
    automate: "0x255F82563b5973264e89526345EcEa766DB3baB2",
    exchangeRate: exchangeRate.address,
    marketManager: marketManager.address,
    systemStatus: systemStatus.address,
  });

  await factory.upgradeAccountImplementation(accountImplement.address);

  return {
    marginAsset,
    perps: [exchangeRate, marketManager],
    marketETH,
    factory,
    events,
    configs,
    accountImplement,
  };
}
