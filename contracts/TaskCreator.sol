// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {ModuleData} from "contracts/utils/gelato/Types.sol";
import {AutomateTaskCreator} from "contracts/utils/gelato/AutomateTaskCreator.sol";
import {IFactory} from "contracts/interfaces/IFactory.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract TaskCreator is AutomateTaskCreator {
    address public immutable factory;
    mapping(bytes32 => address) _taskOwners;

    error OnlyAccounts();

    constructor(
        address _factory,
        address _automate
    ) AutomateTaskCreator(_automate) {
        factory = _factory;
    }

    modifier onlyAccounts() {
        if (!IFactory(factory).accounts(msg.sender)) {
            revert OnlyAccounts();
        }
        _;
    }

    function cancelTask(bytes32 _gelatoTaskId) external onlyAccounts {
        require(_taskOwners[_gelatoTaskId] == msg.sender, "UNAUTHORIZED");
        _cancelTask(_gelatoTaskId);
    }

    function createTask(
        bytes memory execData,
        ModuleData memory moduleData,
        address feeToken
    ) external onlyAccounts returns (bytes32 _gelatoTaskId) {
        _gelatoTaskId = _createTask(msg.sender, execData, moduleData, feeToken);
        _taskOwners[_gelatoTaskId] = msg.sender;
    }

    // fund executions by depositing to 1Balance
    function depositFunds1Balance(
        address token,
        uint256 amount
    ) external payable {
        _depositFunds1Balance(amount, token, address(this));
    }
}
