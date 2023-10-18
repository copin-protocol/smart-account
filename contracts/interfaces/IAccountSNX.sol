// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IPerpsV2MarketConsolidated} from "contracts/interfaces/synthetix/IPerpsV2MarketConsolidated.sol";

interface IAccountSNX {
    error InvalidPrice();

    struct ConstructorParams {
        address factory;
        address events;
        address configs;
        address marginAsset;
        address trustedForwarder;
        address gelato;
        address automate;
        address exchangeRate;
        address marketManager;
        address systemStatus;
    }
}
