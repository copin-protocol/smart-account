// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IAccount} from "contracts/interfaces/IAccount.sol";
import {IAccountGMX} from "contracts/interfaces/IAccountGMX.sol";
import {Account} from "contracts/Account.sol";
import {IPositionRouter} from "contracts/interfaces/gmx/IPositionRouter.sol";
import {IRouter} from "contracts/interfaces/gmx/IRouter.sol";

contract AccountGMX is Account, IAccountGMX {
    IRouter internal immutable ROUTER;
    IPositionRouter internal immutable POSITION_ROUTER;

    constructor(
        ConstructorParams memory _params
    )
        Account(
            IAccount.AccountConstructorParams({
                factory: _params.factory,
                events: _params.events,
                configs: _params.configs,
                marginAsset: _params.marginAsset,
                trustedForwarder: _params.trustedForwarder,
                taskCreator: _params.taskCreator,
                automate: _params.automate
            })
        )
    {
        ROUTER = IRouter(_params.router);
        POSITION_ROUTER = IPositionRouter(_params.positionRouter);
    }

    function _initAccount() internal override {
        ROUTER.approvePlugin(address(POSITION_ROUTER));
    }

    function _increasePosition(bytes calldata _inputs) internal {
        address _baseToken;
        address _indexToken;
        uint256 _amountIn;
        uint256 _minOut;
        uint256 _sizeDelta;
        bool _isLong;
        uint256 _acceptablePrice;
        uint256 _executionFee;
        bytes32 _referralCode;
        assembly {
            _baseToken := calldataload(_inputs.offset)
            _indexToken := calldataload(add(_inputs.offset, 0x20))
            _amountIn := calldataload(add(_inputs.offset, 0x40))
            _minOut := calldataload(add(_inputs.offset, 0x60))
            _sizeDelta := calldataload(add(_inputs.offset, 0x80))
            _isLong := calldataload(add(_inputs.offset, 0xa0))
            _acceptablePrice := calldataload(add(_inputs.offset, 0xc0))
            _executionFee := calldataload(add(_inputs.offset, 0xe0))
            _referralCode := calldataload(add(_inputs.offset, 0x100))
        }
        address[] memory _path = new address[](2);
        _path[0] = _baseToken;
        _path[1] = _indexToken;
        IPositionRouter(POSITION_ROUTER).createIncreasePosition(
            _path,
            _indexToken,
            _amountIn,
            _minOut,
            _sizeDelta,
            _isLong,
            _acceptablePrice,
            _executionFee,
            _referralCode,
            address(0)
        );
    }

    function _decreasePosition(bytes calldata _inputs) internal {
        address _baseToken;
        address _indexToken;
        uint256 _collateralDelta;
        uint256 _sizeDelta;
        bool _isLong;
        address _receiver;
        uint256 _acceptablePrice;
        uint256 _minOut;
        uint256 _executionFee;
        bool _withdrawETH;
        assembly {
            _baseToken := calldataload(_inputs.offset)
            _indexToken := calldataload(add(_inputs.offset, 0x20))
            _collateralDelta := calldataload(add(_inputs.offset, 0x40))
            _sizeDelta := calldataload(add(_inputs.offset, 0x60))
            _isLong := calldataload(add(_inputs.offset, 0x80))
            _receiver := calldataload(add(_inputs.offset, 0xa0))
            _acceptablePrice := calldataload(add(_inputs.offset, 0xc0))
            _minOut := calldataload(add(_inputs.offset, 0xe0))
            _executionFee := calldataload(add(_inputs.offset, 0x100))
            _withdrawETH := calldataload(add(_inputs.offset, 0x120))
        }
        address[] memory _path = new address[](2);
        _path[0] = _baseToken;
        _path[1] = _indexToken;
        IPositionRouter(POSITION_ROUTER).createDecreasePosition(
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
            address(0)
        );
    }
}
