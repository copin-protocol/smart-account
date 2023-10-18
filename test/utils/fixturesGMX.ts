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
  const Router = await ethers.getContractFactory("MockGMXRouter");
  const PositionRouter = await ethers.getContractFactory(
    "MockGMXPositionRouter"
  );
  const Factory = await ethers.getContractFactory("Factory");
  const Events = await ethers.getContractFactory("Events");
  const Configs = await ethers.getContractFactory("Configs");
  const TrustedForwarder = await ethers.getContractFactory(
    "MockTrustedForwarder"
  );
  const Account = await ethers.getContractFactory("AccountGMX");

  const marginAsset = await MarginAsset.deploy(
    ethers.constants.MaxUint256.div(2)
  );
  const router = await Router.deploy();
  const positionRouter = await PositionRouter.deploy();
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
    router: router.address,
    positionRouter: positionRouter.address,
  });

  await factory.upgradeAccountImplementation(accountImplement.address);

  return {
    marginAsset,
    router,
    positionRouter,
    factory,
    events,
    accountImplement,
  };
}
