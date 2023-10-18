import { ethers, network } from "hardhat";
import { abi as factoryAbi } from "../../artifacts/contracts/Factory.sol/Factory.json";
import { CopinNetworkConfig } from "../../utils/types/config";

async function main() {
  const [wallet] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(wallet.address);
  await factory.deployed();
  console.log("Factory deployed to:", factory.address);
  // const factory = new ethers.Contract(
  //   "",
  //   factoryAbi
  // );

  const Events = await ethers.getContractFactory("Events");
  const events = await Events.deploy(factory.address);
  await events.deployed();
  console.log("Events deployed to:", events.address);
  // const events = { address: "" };

  const Configs = await ethers.getContractFactory("Configs");
  const configs = await Configs.deploy(wallet.address);
  await configs.deployed();
  console.log("Configs deployed to:", configs.address);
  // const configs = { address: "" };

  const marginAsset = (network.config as CopinNetworkConfig).MARGIN_ASSET;
  const exchangeRate = (network.config as CopinNetworkConfig).SNX_EXCHANGE_RATE;
  const marketManager = (network.config as CopinNetworkConfig)
    .SNX_MARKET_MANAGER;
  const systemStatus = (network.config as CopinNetworkConfig).SNX_SYSTEM_STATUS;
  const trustedForwarder = (network.config as CopinNetworkConfig)
    .TRUSTED_FORWARDER;
  const gelato = (network.config as CopinNetworkConfig).GELATO;
  const automate = (network.config as CopinNetworkConfig).AUTOMATE;
  const Account = await ethers.getContractFactory("AccountSNX");
  const implementation = await Account.deploy({
    factory: factory.address,
    events: events.address,
    configs: configs.address,
    marginAsset,
    trustedForwarder,
    gelato,
    automate,
    exchangeRate,
    marketManager,
    systemStatus,
  });
  console.log("Account Implementation deployed to:", implementation.address);
  // const implementation = {
  //   address: "",
  // };

  await factory
    .connect(wallet as any)
    .upgradeAccountImplementation(implementation.address);

  // await run("verify:verify", {
  //   address: implementation.address,
  //   constructorArguments: [
  //     {
  //       factory: factory.address,
  //       events: events.address,
  //       configs: configs.address,
  //       marginAsset,
  //       trustedForwarder,
  //       exchangeRate,
  //       marketManager,
  //     },
  //   ],
  // });
}

main();
