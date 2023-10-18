// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import {ISystemStatus} from "contracts/interfaces/synthetix/ISystemStatus.sol";

contract MockSNXSystemStatus is ISystemStatus {
    function requireFuturesMarketActive(bytes32 marketKey) external view {
        return;
    }
}
