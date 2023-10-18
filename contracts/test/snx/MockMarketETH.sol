// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import "hardhat/console.sol";

import {IPerpsV2MarketConsolidated} from "contracts/interfaces/synthetix/IPerpsV2MarketConsolidated.sol";
import {IERC20} from "contracts/interfaces/token/IERC20.sol";

contract MockSNXMarketETH is IPerpsV2MarketConsolidated {
    mapping(address => Position) _positions;
    mapping(address => DelayedOrder) _delayedOrders;
    mapping(address => uint256) _remainingMargins;
    mapping(address => uint256) _accessibleMargins;
    uint64 public nextId;

    IERC20 internal immutable MARGIN_ASSET;

    bytes32 internal constant MARKET_KEY = "sETHPERP"; // testnet

    // bytes32 internal constant MARKET_KEY = "sETH"; // mainnet

    constructor(address marginAsset) {
        MARGIN_ASSET = IERC20(marginAsset);
    }

    function marketKey() external pure returns (bytes32 key) {
        return MARKET_KEY;
    }

    function baseAsset() external pure returns (bytes32 key) {
        return MARKET_KEY;
    }

    function assetPrice() public pure returns (uint256 price, bool invalid) {
        return (2000 * 1e18, false);
    }

    function positions(
        address account
    ) external view returns (Position memory) {
        return _positions[account];
    }

    function mockExecute(address account) public {
        DelayedOrder memory delayedOrder = _delayedOrders[account];
        require(delayedOrder.sizeDelta != 0);
        Position storage position = _positions[account];
        position.id = position.id != 0 ? position.id : nextId++;
        position.size += delayedOrder.sizeDelta;
        position.margin += uint128(_accessibleMargins[account]);
        (uint256 price, bool invalid) = assetPrice();
        require(invalid == false);
        position.lastPrice = uint128(price);
        _accessibleMargins[account] = 0;
        delete _delayedOrders[account];
    }

    function delayedOrders(
        address account
    ) external view returns (DelayedOrder memory) {
        return _delayedOrders[account];
    }

    function mockDelayedOrder(
        address account,
        DelayedOrder calldata delayedOrder
    ) public {
        _delayedOrders[account] = delayedOrder;
    }

    function accessibleMargin(
        address account
    ) external view returns (uint marginAccessible, bool invalid) {
        return (_accessibleMargins[account], true);
    }

    function mockAccessibleMargin(address account, uint256 amount) public {
        _accessibleMargins[account] = amount;
        _remainingMargins[account] = amount;
    }

    function transferMargin(int256 marginDelta) external {
        // if amount is positive, deposit
        if (marginDelta > 0) {
            _remainingMargins[msg.sender] += _abs(marginDelta);
            _accessibleMargins[msg.sender] += _abs(marginDelta);
        } else if (marginDelta < 0) {
            // if amount is negative, withdraw
            _remainingMargins[msg.sender] -= _abs(marginDelta);
            _accessibleMargins[msg.sender] -= _abs(marginDelta);
        }
    }

    function withdrawAllMargin() external {
        _remainingMargins[msg.sender] -= _accessibleMargins[msg.sender];
        _accessibleMargins[msg.sender] = 0;
    }

    function modifyPositionWithTracking(
        int256 sizeDelta,
        uint256 desiredFillPrice,
        bytes32 trackingCode
    ) external {}

    function closePositionWithTracking(
        uint256 desiredFillPrice,
        bytes32 trackingCode
    ) external {}

    function submitCloseOffchainDelayedOrderWithTracking(
        uint256 desiredFillPrice,
        bytes32 trackingCode
    ) external {
        DelayedOrder storage delayedOrder = _delayedOrders[msg.sender];
        Position memory position = _positions[msg.sender];
        require(delayedOrder.sizeDelta == 0);
        require(position.size != 0);

        delayedOrder.isOffchain = true;
        delayedOrder.sizeDelta = -position.size;
        delayedOrder.desiredFillPrice = uint128(desiredFillPrice);
        delayedOrder.targetRoundId = 0;
        delayedOrder.commitDeposit = 0;
        delayedOrder.keeperDeposit = 1 ether;
        delayedOrder.executableAtTime = 0;
        delayedOrder.intentionTime = block.timestamp;
        delayedOrder.trackingCode = trackingCode;
    }

    function submitCloseDelayedOrderWithTracking(
        uint256 desiredTimeDelta,
        uint256 desiredFillPrice,
        bytes32 trackingCode
    ) external {}

    function submitDelayedOrderWithTracking(
        int256 sizeDelta,
        uint256 desiredTimeDelta,
        uint256 desiredFillPrice,
        bytes32 trackingCode
    ) external {}

    function submitOffchainDelayedOrderWithTracking(
        int256 sizeDelta,
        uint256 desiredFillPrice,
        bytes32 trackingCode
    ) external {
        require(_delayedOrders[msg.sender].sizeDelta == 0);
        DelayedOrder storage delayedOrder = _delayedOrders[msg.sender];
        delayedOrder.isOffchain = true;
        delayedOrder.sizeDelta = int128(sizeDelta);
        delayedOrder.desiredFillPrice = uint128(desiredFillPrice);
        delayedOrder.targetRoundId = 0;
        delayedOrder.commitDeposit = 0;
        delayedOrder.keeperDeposit = 1 ether;
        delayedOrder.executableAtTime = 0;
        delayedOrder.intentionTime = block.timestamp;
        delayedOrder.trackingCode = trackingCode;
    }

    function cancelDelayedOrder(address account) external {}

    function cancelOffchainDelayedOrder(address account) external {
        require(_delayedOrders[msg.sender].sizeDelta != 0);
        delete _delayedOrders[account];
    }

    function _abs(int256 x) internal pure returns (uint256 z) {
        assembly {
            let mask := sub(0, shr(255, x))
            z := xor(mask, add(mask, x))
        }
    }
}
