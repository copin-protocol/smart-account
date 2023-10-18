const { ethers, network } = require("hardhat");
import { abi as factoryAbi } from "../../artifacts/contracts/Factory.sol/Factory.json";
import { abi as configsAbi } from "../../artifacts/contracts/Configs.sol/Configs.json";
import { CopinNetworkConfig } from "../../utils/types/config";
import {
  CONFIGS_ADDRESS,
  EVENTS_ADDRESS,
  FACTORY_ADDRESS,
} from "../../utils/constants";

async function main() {
  const [wallet] = await ethers.getSigners();

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
    factory: FACTORY_ADDRESS,
    events: EVENTS_ADDRESS,
    configs: CONFIGS_ADDRESS,
    marginAsset,
    trustedForwarder,
    gelato,
    automate,
    exchangeRate,
    marketManager,
    systemStatus,
  });
  console.log("Account Implementation deployed to:", implementation.address);

  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi);
  await factory.connect(wallet).upgradeAccountImplementation(
    implementation.address
    // "0x9811DEd31002276e9081E635C3b38DCF037f99Cb"
  );

  console.log("upgraded AccountImplementation");

  // const configs = new ethers.Contract(
  //   CONFIGS_ADDRESS,
  //   configsAbi,
  //   wallet
  // );
  // await configs.setExecutorFee(utils.parseEther("0.0002"));
  // console.log("upgraded executorFee");

  // await run("verify:verify", {
  //   address: implementation.address,
  //   constructorArguments: [
  //     {
  //       factory: FACTORY_ADDRESS,
  //       events: EVENTS_ADDRESS,
  //       configs: CONFIGS_ADDRESS,
  //       marginAsset,
  //       trustedForwarder,
  //       exchangeRate,
  //       marketManager,
  //     },
  //   ],
  // });
}

main();
