import { ethers, network, run } from "hardhat";
import { abi as factoryAbi } from "../../artifacts/contracts/Factory.sol/Factory.json";
import { CopinNetworkConfig } from "../../utils/types/config";

async function main() {
  const [wallet] = await ethers.getSigners();

  // const Factory = await ethers.getContractFactory("Factory");
  // const factory = await Factory.deploy(wallet.address);
  // await factory.deployed();
  // console.log("Factory deployed to:", factory.address);
  const factory = new ethers.Contract(
    "0xCEB2932523CfF0Fb08f1ece42d3AD0A000708eAB",
    factoryAbi
  );

  // const Events = await ethers.getContractFactory("Events");
  // const events = await Events.deploy(factory.address);
  // await events.deployed();
  // console.log("Events deployed to:", events.address);
  const events = { address: "0x72EcC1BD901Ba26aD07CE188B6d88919a53e6484" };

  // const Configs = await ethers.getContractFactory("Configs");
  // const configs = await Configs.deploy(wallet.address);
  // await configs.deployed();
  // console.log("Configs deployed to:", configs.address);
  const configs = { address: "0xE79E13cc8A93c5904ba61Ecf9b6AE2d4A8017f39" };

  const marginAsset = (network.config as CopinNetworkConfig).MARGIN_ASSET;
  const exchangeRate = (network.config as CopinNetworkConfig).SNX_EXCHANGE_RATE;
  const marketManager = (network.config as CopinNetworkConfig)
    .SNX_MARKET_MANAGER;
  const systemStatus = (network.config as CopinNetworkConfig).SNX_SYSTEM_STATUS;
  const trustedForwarder = (network.config as CopinNetworkConfig)
    .TRUSTED_FORWARDER;
  const automate = (network.config as CopinNetworkConfig).AUTOMATE;

  // const TaskCreator = await ethers.getContractFactory("TaskCreator");
  // const taskCreator = await TaskCreator.deploy(factory.address, automate);
  // await taskCreator.deployed();
  // console.log("TaskCreator deployed to:", taskCreator.address);
  const taskCreator = { address: "0x4fE31a09173B8f99328C550feB3F74aDf481b063" };

  // const Account = await ethers.getContractFactory("AccountSNX");
  // const implementation = await Account.deploy({
  //   factory: factory.address,
  //   events: events.address,
  //   configs: configs.address,
  //   marginAsset,
  //   trustedForwarder,
  //   automate,
  //   taskCreator: taskCreator.address,
  //   exchangeRate,
  //   marketManager,
  //   systemStatus,
  // });
  // console.log("Account Implementation deployed to:", implementation.address);
  const implementation = {
    address: "0x78f9cE37ff5278C7382B687ADd05895c9cC75051",
  };

  // await factory
  //   .connect(wallet as any)
  //   .upgradeAccountImplementation(implementation.address);

  await run("verify:verify", {
    address: implementation.address,
    constructorArguments: [
      {
        factory: factory.address,
        events: events.address,
        configs: configs.address,
        marginAsset,
        trustedForwarder,
        taskCreator: taskCreator.address,
        automate,
        exchangeRate,
        marketManager,
        systemStatus,
      },
    ],
  });
}

main();
