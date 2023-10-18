// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

interface IRouter {
    function approvedPlugins(
        address plugin,
        address account
    ) external returns (bool);

    function approvePlugin(address _plugin) external;

    function denyPlugin(address _plugin) external;
}
