import { GelatoRelay } from "@gelatonetwork/relay-sdk";
import { Contract } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers, network } from "hardhat";
import { abi as accountAbi } from "../../artifacts/contracts/Account.sol/Account.json";
import { abi as marginAssetAbi } from "../../artifacts/contracts/test/MarginAsset.sol/MarginAsset.json";
// import { formatBytes32String } from "@ethersproject/bytes";
import { CopinNetworkConfig } from "../../utils/types/config";
import { SMART_ACCOUNT_ADDRESS, GELATO_API_KEY } from "../../utils/constants";
import {
  calculateDesiredFillPrice,
  closeOrder,
  placeOrder,
} from "../../utils/perps";
import marketAbi from "../../utils/abis/marketAbi";
// const { formatUnits } = require("ethers/lib/utils");

const relay = new GelatoRelay();

async function main() {
  const [, , wallet3] = await ethers.getSigners();

  const config = network.config as CopinNetworkConfig;

  const nodeURL = config.url;

  // await usdc.transfer(account.address, balance);
  const provider = new JsonRpcProvider(nodeURL);
  const signer: any = new ethers.Wallet(process.env.PRIVATE_KEY_3!, provider);
  const account = new Contract(SMART_ACCOUNT_ADDRESS, accountAbi, signer);

  const market = (network.config as CopinNetworkConfig).SNX_MARKET_ETH;

  const perp = new ethers.Contract(market, marketAbi, wallet3);

  const { commands, inputs } = await closeOrder({
    market: perp,
    account,
  });

  console.log(commands);

  const { data } = await account
    .connect(signer)
    .populateTransaction.execute(commands, inputs);

  const chainId = await signer.getChainId();
  console.log("chainId", chainId);

  if (!data) throw Error("invalid calldata");

  // Populate a relay request
  const request = {
    chainId: chainId as any,
    target: account.address,
    data: data,
    user: signer.address,
  };

  (signer as any).signTypedData = signer._signTypedData;

  // Without a specific API key, the relay request will fail!
  // Go to https://relay.gelato.network to get a testnet API key with 1Balance.
  // Send a relay request using Gelato Relay!
  const relayResponse = await relay.sponsoredCallERC2771(
    request,
    signer as any,
    GELATO_API_KEY
  );
  console.log("relayResponse", relayResponse);
}

main();
