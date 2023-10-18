// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IRouter} from "contracts/interfaces/gmx/IRouter.sol";

contract MockGMXRouter is IRouter {
    mapping(address => mapping(address => bool)) public approvedPlugins;

    receive() external payable {}

    function approvePlugin(address _plugin) external {
        approvedPlugins[msg.sender][_plugin] = true;
    }

    function denyPlugin(address _plugin) external {
        approvedPlugins[msg.sender][_plugin] = false;
    }
}
