// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IAccount} from "contracts/interfaces/IAccount.sol";
import {IConfigs} from "contracts/interfaces/IConfigs.sol";
import {IAccountSNX, IPerpsV2MarketConsolidated} from "contracts/interfaces/IAccountSNX.sol";
import {Account} from "contracts/Account.sol";
import {IFuturesMarketManager} from "contracts/interfaces/synthetix/IFuturesMarketManager.sol";
import {IPerpsV2ExchangeRate} from "contracts/interfaces/synthetix/IPerpsV2ExchangeRate.sol";
import {ISystemStatus} from "contracts/interfaces/synthetix/ISystemStatus.sol";
import "hardhat/console.sol";

contract AccountSNX is Account, IAccountSNX {
    IPerpsV2ExchangeRate internal immutable PERPS_V2_EXCHANGE_RATE;
    IFuturesMarketManager internal immutable FUTURES_MARKET_MANAGER;
    ISystemStatus internal immutable SYSTEM_STATUS;
    uint256 internal constant MAX_PRICE_LATENCY = 120;
    bytes32 internal constant ETH_MARKET_KEY = "sETHPERP"; // testnet

    // bytes32 internal constant ETH_MARKET_KEY = "sETH"; // mainnet

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
                gelato: _params.gelato,
                automate: _params.automate
            })
        )
    {
        PERPS_V2_EXCHANGE_RATE = IPerpsV2ExchangeRate(_params.exchangeRate);
        FUTURES_MARKET_MANAGER = IFuturesMarketManager(_params.marketManager);
        SYSTEM_STATUS = ISystemStatus(_params.systemStatus);
    }

    function executorUsdFee() public view override returns (uint256) {
        return _amountBysUSD(CONFIGS.executorFee());
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
