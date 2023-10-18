// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IFuturesMarketManager} from "contracts/interfaces/synthetix/IFuturesMarketManager.sol";
import {IPerpsV2MarketConsolidated} from "contracts/interfaces/synthetix/IPerpsV2MarketConsolidated.sol";

contract MockSNXMarketManager is IFuturesMarketManager {
    mapping(bytes32 => address) public marketForKey;

    function addMarket(address _market) external {
        IPerpsV2MarketConsolidated market = IPerpsV2MarketConsolidated(_market);
        bytes32 key = market.marketKey();
        marketForKey[key] = _market;
    }
}
