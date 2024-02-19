// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IAccount} from "contracts/interfaces/IAccount.sol";
import {IConfigs} from "contracts/interfaces/IConfigs.sol";
import {IAccountSNX, IPerpsV2MarketConsolidated} from "contracts/interfaces/IAccountSNX.sol";
import {Account} from "contracts/Account.sol";
import {IFuturesMarketManager} from "contracts/interfaces/synthetix/IFuturesMarketManager.sol";
import {IPerpsV2ExchangeRate} from "contracts/interfaces/synthetix/IPerpsV2ExchangeRate.sol";
import {ISystemStatus} from "contracts/interfaces/synthetix/ISystemStatus.sol";

contract AccountSNX is Account, IAccountSNX {
    IPerpsV2ExchangeRate internal immutable PERPS_V2_EXCHANGE_RATE;
    IFuturesMarketManager internal immutable FUTURES_MARKET_MANAGER;
    ISystemStatus internal immutable SYSTEM_STATUS;
    uint256 internal constant MAX_PRICE_LATENCY = 120;
    bytes32 internal constant ETH_MARKET_KEY = "sETHPERP";

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
                automate: _params.automate,
                taskCreator: _params.taskCreator
            })
        )
    {
        PERPS_V2_EXCHANGE_RATE = IPerpsV2ExchangeRate(_params.exchangeRate);
        FUTURES_MARKET_MANAGER = IFuturesMarketManager(_params.marketManager);
        SYSTEM_STATUS = ISystemStatus(_params.systemStatus);
    }

    function executorUsdFee(
        uint256 _fee
    ) public view override returns (uint256) {
        return _amountBysUSD(_fee);
    }

    function _perpCancelOrder(
        bytes calldata _inputs
    ) internal override returns (address market) {
        assembly {
            market := calldataload(_inputs.offset)
        }
        // IPerpsV2MarketConsolidated.DelayedOrder
        //     memory delayedOrder = IPerpsV2MarketConsolidated(market)
        //         .delayedOrders(address(this));
        IPerpsV2MarketConsolidated(market).cancelOffchainDelayedOrder(
            address(this)
        );
    }

    function _perpWithdrawAllMargin(bytes calldata _inputs) internal override {
        address market;
        assembly {
            market := calldataload(_inputs.offset)
        }
        IPerpsV2MarketConsolidated(market).withdrawAllMargin();
    }

    function _perpModifyMargin(bytes calldata _inputs) internal override {
        address market;
        int256 amount;
        assembly {
            market := calldataload(_inputs.offset)
            amount := calldataload(add(_inputs.offset, 0x20))
        }
        if (amount > 0) {
            _sufficientMargin(amount);
        }
        IPerpsV2MarketConsolidated(market).transferMargin(amount);
    }

    function _perpSubmitCreateOrder(bytes calldata _inputs) internal override {
        address market;
        int256 sizeDelta;
        uint256 desiredFillPrice;
        assembly {
            market := calldataload(_inputs.offset)
            sizeDelta := calldataload(add(_inputs.offset, 0x20))
            desiredFillPrice := calldataload(add(_inputs.offset, 0x40))
        }
        uint256 size = _amountBysUSD(_abs(sizeDelta));
        _preOrder(market, size);
        IPerpsV2MarketConsolidated(market)
            .submitOffchainDelayedOrderWithTracking({
                sizeDelta: sizeDelta,
                desiredFillPrice: desiredFillPrice,
                trackingCode: TRACKING_CODE
            });
        _postOrder(market, size);
    }

    function _perpSubmitCloseOrder(bytes calldata _inputs) internal override {
        address market;
        uint256 desiredFillPrice;
        assembly {
            market := calldataload(_inputs.offset)
            desiredFillPrice := calldataload(add(_inputs.offset, 0x20))
        }

        IPerpsV2MarketConsolidated.Position
            memory position = IPerpsV2MarketConsolidated(market).positions(
                address(this)
            );
        uint256 size = _amountBysUSD(_abs(position.size));
        _preOrder(market, size);
        IPerpsV2MarketConsolidated(market)
            .submitCloseOffchainDelayedOrderWithTracking({
                desiredFillPrice: desiredFillPrice,
                trackingCode: TRACKING_CODE
            });
        _postOrder(market, size);
    }

    function _perpValidTask(
        Task memory _task
    ) internal view override returns (bool) {
        try SYSTEM_STATUS.requireFuturesMarketActive(_task.market) {} catch {
            return false;
        }
        uint256 price = _sUSDRate(_getPerpsV2Market(_task.market));
        if (_task.command == TaskCommand.STOP_LOSS) {
            if (_task.sizeDelta > 0) {
                // Long: increase position size (buy) once *above* target price
                // ex: unwind short position once price is above target (prevent further loss)
                return price >= _task.triggerPrice;
            } else {
                // Short: decrease position size (sell) once *below* target price
                // ex: unwind long position once price is below target (prevent further loss)
                return price <= _task.triggerPrice;
            }
        }
        return false;
    }

    function _perpExecuteTask(Task memory _task) internal override {
        // // define Synthetix PerpsV2 market
        // IPerpsV2MarketConsolidated market = _getPerpsV2Market(_task.marketKey);
        // /// @dev conditional order is valid given checker() returns true; define fill price
        // (uint256 fillPrice, PriceOracleUsed priceOracle) = _sUSDRate(market);
        // // if conditional order is reduce only, ensure position size is only reduced
        // if (conditionalOrder.reduceOnly) {
        //     int256 currentSize = market
        //         .positions({account: address(this)})
        //         .size;
        //     // ensure position exists and incoming size delta is NOT the same sign
        //     /// @dev if incoming size delta is the same sign, then the conditional order is not reduce only
        //     if (
        //         currentSize == 0 ||
        //         _isSameSign(currentSize, conditionalOrder.sizeDelta)
        //     ) {
        //         EVENTS.emitConditionalOrderCancelled({
        //             conditionalOrderId: _conditionalOrderId,
        //             gelatoTaskId: conditionalOrder.gelatoTaskId,
        //             reason: ConditionalOrderCancelledReason
        //                 .CONDITIONAL_ORDER_CANCELLED_NOT_REDUCE_ONLY
        //         });
        //         return;
        //     }
        //     // ensure incoming size delta is not larger than current position size
        //     /// @dev reduce only conditional orders can only reduce position size (i.e. approach size of zero) and
        //     /// cannot cross that boundary (i.e. short -> long or long -> short)
        //     if (_abs(conditionalOrder.sizeDelta) > _abs(currentSize)) {
        //         // bound conditional order size delta to current position size
        //         conditionalOrder.sizeDelta = -currentSize;
        //     }
        // }
        // // if margin was committed, free it
        // if (conditionalOrder.marginDelta > 0) {
        //     committedMargin -= _abs(conditionalOrder.marginDelta);
        // }
        // // execute trade
        // _perpsV2ModifyMargin({
        //     _market: address(market),
        //     _amount: conditionalOrder.marginDelta
        // });
        // _perpsV2SubmitOffchainDelayedOrder({
        //     _market: address(market),
        //     _sizeDelta: conditionalOrder.sizeDelta,
        //     _desiredFillPrice: conditionalOrder.desiredFillPrice
        // });
    }

    function _getPerpsV2Market(
        bytes32 _marketKey
    ) internal view returns (IPerpsV2MarketConsolidated market) {
        market = IPerpsV2MarketConsolidated(
            FUTURES_MARKET_MANAGER.marketForKey(_marketKey)
        );
        assert(address(market) != address(0));
    }

    function _sUSDRate(
        IPerpsV2MarketConsolidated _market
    ) internal view returns (uint256) {
        bytes32 assetId = _market.baseAsset();

        (uint256 price, uint256 publishTime) = PERPS_V2_EXCHANGE_RATE
            .resolveAndGetLatestPrice(assetId);

        // if the price is stale, get the latest price from the market
        if (publishTime < block.timestamp - MAX_PRICE_LATENCY) {
            // fetch asset price and ensure it is valid
            bool invalid;
            (price, invalid) = _market.assetPrice();
            if (invalid) revert InvalidPrice();
        }
        return price;
    }

    function _amountBysUSD(uint256 amount) internal view returns (uint256) {
        return
            (amount * _sUSDRate(_getPerpsV2Market(ETH_MARKET_KEY))) /
            (10 ** MARGIN_ASSET.decimals());
    }
}
