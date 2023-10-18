// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IPerpsV2ExchangeRate} from "contracts/interfaces/synthetix/IPerpsV2ExchangeRate.sol";

contract MockSNXExchangeRate is IPerpsV2ExchangeRate {
    bytes32 internal constant ETH_MARKET_KEY = "sETHPERP"; // testnet

    // bytes32 internal constant ETH_MARKET_KEY = "sETH"; // mainnet

    function resolveAndGetLatestPrice(
        bytes32 assetId
    ) external view returns (uint256 price, uint256 publishTime) {
        if (assetId == ETH_MARKET_KEY) return (2000 * 1e18, block.timestamp);
        return (1 ether, block.timestamp);
    }
}
