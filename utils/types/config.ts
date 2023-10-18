import { NetworkConfig } from "hardhat/types";

export type CopinNetworkConfig = NetworkConfig & {
  MARGIN_ASSET: string;
  TRUSTED_FORWARDER: string;
  SNX_EXCHANGE_RATE: string;
  SNX_MARKET_MANAGER: string;
  SNX_SYSTEM_STATUS: string;
  SNX_MARKET_ETH: string;
  GELATO: string;
  AUTOMATE: string;
  url: string;
};
