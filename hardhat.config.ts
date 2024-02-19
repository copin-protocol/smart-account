require("dotenv").config();
import "hardhat-gas-reporter";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
// import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 800,
      },
      metadata: {
        bytecodeHash: "none",
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    testnet: {
      url: process.env.TESTNET_NODE_URL,
      accounts: [
        process.env.PRIVATE_KEY_1!,
        process.env.PRIVATE_KEY_2!,
        process.env.PRIVATE_KEY_3!,
      ],
      ...{
        MARGIN_ASSET: "0xeBaEAAD9236615542844adC5c149F86C36aD1136",
        GELATO: "0xF82D64357D9120a760e1E4C75f646C0618eFc2F3",
        AUTOMATE: "0x255F82563b5973264e89526345EcEa766DB3baB2",
        TRUSTED_FORWARDER: "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c",
        ETH_MARKET_KEY:
          "0x7345544850455250000000000000000000000000000000000000000000000000",
        SNX_MARKET_ETH: "0x111babcdd66b1b60a20152a2d3d06d36f8b5703c",
        SNX_MARKET_BTC: "0xd5844EA3701a4507C27ebc5EBA733E1Aa2915B31",
        SNX_MARKET_LINK: "0x6141dcfF3494921e1C4Cdb115daD20C6656f6EFA",
        SNX_EXCHANGE_RATE: "0x699DFf510a94ac0738548b9097E3FE896EEa7331",
        SNX_MARKET_MANAGER: "0x93E42aF866EEEf6C8c6f22B1BcDbf97a00159a2e",
        SNX_SYSTEM_STATUS: "0x9D89fF8C6f3CC22F4BbB859D0F85FB3a4e1FA916",
      },
    },
    mainnet: {
      url: process.env.MAINNET_NODE_URL,
      accounts: [
        process.env.PRIVATE_KEY_1!,
        process.env.PRIVATE_KEY_2!,
        process.env.PRIVATE_KEY_3!,
      ],
      ...{
        MARGIN_ASSET: "0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9",
        GELATO: "0x01051113D81D7d6DA508462F2ad6d7fD96cF42Ef",
        AUTOMATE: "0x340759c8346A1E6Ed92035FB8B6ec57cE1D82c2c",
        TRUSTED_FORWARDER: "0xd8253782c45a12053594b9deB72d8e8aB2Fca54c",
        ETH_MARKET_KEY:
          "0x7345544850455250000000000000000000000000000000000000000000000000",
        SNX_MARKET_ETH: "0x2B3bb4c683BFc5239B029131EEf3B1d214478d93",
        SNX_MARKET_BTC: "0x59b007E9ea8F89b069c43F8f45834d30853e3699",
        SNX_MARKET_LINK: "0x31A1659Ca00F617E86Dc765B6494Afe70a5A9c1A",
        SNX_EXCHANGE_RATE: "0x2C15259D4886e2C0946f9aB7a5E389c86b3c3b04",
        SNX_MARKET_MANAGER: "0xd30bdFd7e7a65fE109D5dE1D4e95F3B800FB7463",
        SNX_SYSTEM_STATUS: "0xE8c41bE1A167314ABAF2423b72Bf8da826943FFD",
      },
    },
  },
  gasReporter: {
    currency: "USD",
    token: "ETH",
    gasPrice: 22,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY!,
      optimisticEthereum: process.env.OPSCAN_API_KEY!,
      arbitrumOne: process.env.ARBISCAN_API_KEY!,
    },
    customChains: [
      {
        network: "arbitrumOne",
        chainId: 421613,
        urls: {
          apiURL: "https://api-testnet.arbiscan.io/api",
          browserURL: "https://testnet.arbiscan.io",
        },
      },
      {
        network: "optimisticEthereum",
        chainId: 420,
        urls: {
          apiURL: "https://api-goerli-optimism.etherscan.io/api",
          browserURL: "https://goerli-optimism.etherscan.io",
        },
      },
    ],
  },
};

export default config;
