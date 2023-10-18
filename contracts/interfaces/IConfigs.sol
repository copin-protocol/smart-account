// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IConfigs {
    event ExecutorFeeSet(uint256 executorFee);

    event ProtocolFeeSet(uint256 protocolFee);

    event FeeReceiverSet(address feeReceiver);

    event TokenWhitelistStatusUpdated(address token, bool isWhitelisted);

    function executorFee() external view returns (uint256);

    function protocolFee() external view returns (uint256);

    function feeReceiver() external view returns (address);

    function isTokenWhitelisted(address _token) external view returns (bool);

    function setExecutorFee(uint256 _executorFee) external;

    function setProtocolFee(uint256 _protocolFee) external;

    function setFeeReceiver(address _feeReceiver) external;

    function setTokenWhitelistStatus(
        address _token,
        bool _isWhitelisted
    ) external;
}
