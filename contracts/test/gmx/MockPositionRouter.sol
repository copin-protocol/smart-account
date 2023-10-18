// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IPositionRouter} from "contracts/interfaces/gmx/IPositionRouter.sol";

contract MockGMXPositionRouter is ReentrancyGuard, IPositionRouter {
    event CreateIncreasePosition(
        address indexed account,
        address[] path,
        address indexToken,
        uint256 amountIn,
        uint256 minOut,
        uint256 sizeDelta,
        bool isLong,
        uint256 acceptablePrice,
        uint256 executionFee,
        bytes32 _referralCode,
        address callbackTarget
    );

    event CreateDecreasePosition(
        address indexed account,
        address[] path,
        address indexToken,
        uint256 collateralDelta,
        uint256 sizeDelta,
        bool isLong,
        address receiver,
        uint256 acceptablePrice,
        uint256 minOut,
        uint256 executionFee,
        bool withdrawETH,
        address callbackTarget
    );

    function createIncreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _amountIn,
        uint256 _minOut,
        uint256 _sizeDelta,
        bool _isLong,
        uint256 _acceptablePrice,
        uint256 _executionFee,
        bytes32 _referralCode,
        address _callbackTarget
    ) external payable nonReentrant returns (bytes32) {
        emit CreateIncreasePosition(
            msg.sender,
            _path,
            _indexToken,
            _amountIn,
            _minOut,
            _sizeDelta,
            _isLong,
            _acceptablePrice,
            _executionFee,
            _referralCode,
            _callbackTarget
        );
        return "0x0";
    }

    function createDecreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _collateralDelta,
        uint256 _sizeDelta,
        bool _isLong,
        address _receiver,
        uint256 _acceptablePrice,
        uint256 _minOut,
        uint256 _executionFee,
        bool _withdrawETH,
        address _callbackTarget
    ) external payable nonReentrant returns (bytes32) {
        emit CreateDecreasePosition(
            msg.sender,
            _path,
            _indexToken,
            _collateralDelta,
            _sizeDelta,
            _isLong,
            _receiver,
            _acceptablePrice,
            _minOut,
            _executionFee,
            _withdrawETH,
            _callbackTarget
        );
        return "0x0";
    }
}
