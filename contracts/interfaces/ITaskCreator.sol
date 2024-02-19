// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import {ModuleData} from "contracts/utils/gelato/Types.sol";

interface ITaskCreator {
    function factory() external view returns (address);

    function cancelTask(bytes32 _gelatoTaskId) external;

    function createTask(
        bytes memory execData,
        ModuleData memory moduleData,
        address feeToken
    ) external returns (bytes32 _gelatoTaskId);

    function depositFunds1Balance(address token, uint256 amount) external;
}
