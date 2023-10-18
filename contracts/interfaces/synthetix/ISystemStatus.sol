// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface ISystemStatus {
    function requireFuturesMarketActive(bytes32 marketKey) external view;
}
