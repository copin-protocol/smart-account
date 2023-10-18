// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IConfigs} from "contracts/interfaces/IConfigs.sol";
import {Owned} from "contracts/utils/Owned.sol";

contract Configs is IConfigs, Owned {
    uint256 public executorFee = 1 ether / 5000;
    uint256 public protocolFee = 4000;
    address public feeReceiver;

    mapping(address => bool) internal _whitelistedTokens;

    constructor(address _owner) Owned(_owner) {
        feeReceiver = _owner;
    }

    function isTokenWhitelisted(
        address _token
    ) external view override returns (bool) {
        return _whitelistedTokens[_token];
    }

    function setExecutorFee(uint256 _executorFee) external override onlyOwner {
        executorFee = _executorFee;
        emit ExecutorFeeSet(_executorFee);
    }

    function setProtocolFee(uint256 _protocolFee) external override onlyOwner {
        protocolFee = _protocolFee;
        emit ProtocolFeeSet(protocolFee);
    }

    function setFeeReceiver(address _feeReceiver) external override onlyOwner {
        feeReceiver = _feeReceiver;
        emit FeeReceiverSet(feeReceiver);
    }

    function setTokenWhitelistStatus(
        address _token,
        bool _isWhitelisted
    ) external override onlyOwner {
        _whitelistedTokens[_token] = _isWhitelisted;
        emit TokenWhitelistStatusUpdated(_token, _isWhitelisted);
    }
}
