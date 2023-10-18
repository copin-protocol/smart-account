import { ethers, run } from "hardhat";

async function deploy() {
  const marginAssetFactory = await ethers.getContractFactory("MarginAsset");
  const initialSupply = ethers.utils.parseUnits("24000000000", 6);
  const marginAsset = await marginAssetFactory.deploy(initialSupply);
  const marginAssetDeployed = await marginAsset.deployed();
  console.log("Margin Asset deployed to:", marginAssetDeployed.address);

  await new Promise((resolve) => setTimeout(() => resolve(true), 10000));

  await run("verify:verify", {
    address: marginAssetDeployed.address,
    constructorArguments: [initialSupply],
  });
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
