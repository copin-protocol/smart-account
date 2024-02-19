import { NetworkConfig } from "hardhat/types";

export type CopinNetworkConfig = NetworkConfig & {
  MARGIN_ASSET: string;
  TRUSTED_FORWARDER: string;
  SNX_EXCHANGE_RATE: string;
  SNX_MARKET_MANAGER: string;
  SNX_SYSTEM_STATUS: string;
  SNX_MARKET_ETH: string;
  SNX_MARKET_BTC: string;
  SNX_MARKET_LINK: string;
  GELATO: string;
  AUTOMATE: string;
  url: string;
};
