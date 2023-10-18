// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IAccount} from "./IAccount.sol";

interface IEvents {
    error OnlyAccounts();

    function factory() external view returns (address);

    function emitDeposit(address user, uint256 amount) external;

    event Deposit(
        address indexed user,
        address indexed account,
        uint256 amount
    );

    function emitWithdraw(address user, uint256 amount) external;

    event Withdraw(
        address indexed user,
        address indexed account,
        uint256 amount
    );

    function emitEthWithdraw(address user, uint256 amount) external;

    event EthWithdraw(
        address indexed user,
        address indexed account,
        uint256 amount
    );

    function emitChargeExecutorFee(
        address executor,
        address receiver,
        uint256 fee
    ) external;

    event ChargeExecutorFee(
        address indexed executor,
        address indexed receiver,
        address indexed account,
        uint256 fee
    );

    function emitChargeProtocolFee(
        address receiver,
        uint256 size,
        uint256 fee
    ) external;

    event ChargeProtocolFee(
        address indexed receiver,
        address indexed account,
        uint256 size,
        uint256 fee
    );
}
