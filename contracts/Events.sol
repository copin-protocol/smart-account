// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IAccount, IEvents} from "./interfaces/IEvents.sol";
import {IFactory} from "./interfaces/IFactory.sol";

contract Events is IEvents {
    address public immutable factory;

    modifier onlyAccounts() {
        if (!IFactory(factory).accounts(msg.sender)) {
            revert OnlyAccounts();
        }
        _;
    }

    constructor(address _factory) {
        factory = _factory;
    }

    function emitDeposit(
        address user,
        uint256 amount
    ) external override onlyAccounts {
        emit Deposit({user: user, account: msg.sender, amount: amount});
    }

    function emitWithdraw(
        address user,
        uint256 amount
    ) external override onlyAccounts {
        emit Withdraw({user: user, account: msg.sender, amount: amount});
    }

    function emitEthWithdraw(
        address user,
        uint256 amount
    ) external override onlyAccounts {
        emit EthWithdraw({user: user, account: msg.sender, amount: amount});
    }

    function emitChargeExecutorFee(
        address executor,
        address receiver,
        uint256 fee,
        uint256 feeUsd
    ) external override onlyAccounts {
        emit ChargeExecutorFee({
            executor: executor,
            receiver: receiver,
            account: msg.sender,
            fee: fee,
            feeUsd: feeUsd
        });
    }

    function emitChargeProtocolFee(
        address receiver,
        uint256 size,
        uint256 fee
    ) external override onlyAccounts {
        emit ChargeProtocolFee({
            receiver: receiver,
            account: msg.sender,
            size: size,
            fee: fee
        });
    }

    function emitCreateGelatoTask(
        uint256 taskId,
        bytes32 gelatoTaskId,
        IAccount.TaskCommand command,
        bytes32 market,
        int256 marginDelta,
        int256 sizeDelta,
        uint256 triggerPrice,
        uint256 desiredPrice,
        bytes32 options
    ) external override onlyAccounts {
        emit CreateGelatoTask({
            account: msg.sender,
            taskId: taskId,
            gelatoTaskId: gelatoTaskId,
            command: command,
            market: market,
            marginDelta: marginDelta,
            sizeDelta: sizeDelta,
            triggerPrice: triggerPrice,
            desiredPrice: desiredPrice,
            options: options
        });
    }

    function emitGelatoTaskRunned(
        uint256 taskId,
        bytes32 gelatoTaskId,
        uint256 fillPrice,
        uint256 fee
    ) external override onlyAccounts {
        emit GelatoTaskRunned({
            account: msg.sender,
            taskId: taskId,
            gelatoTaskId: gelatoTaskId,
            fillPrice: fillPrice,
            fee: fee
        });
    }

    function emitGelatoTaskCanceled(
        uint256 taskId,
        bytes32 gelatoTaskId,
        bytes32 reason
    ) external override onlyAccounts {
        emit GelatoTaskCanceled({
            account: msg.sender,
            taskId: taskId,
            gelatoTaskId: gelatoTaskId,
            reason: reason
        });
    }
}
