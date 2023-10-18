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
        uint256 fee
    ) external override onlyAccounts {
        emit ChargeExecutorFee({
            executor: executor,
            receiver: receiver,
            account: msg.sender,
            fee: fee
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
}
