// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IFuturesMarketManager {
    function marketForKey(bytes32 marketKey) external view returns (address);
}
