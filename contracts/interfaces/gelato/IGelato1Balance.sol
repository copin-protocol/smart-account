// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IGelato1Balance} from "./IGelato1Balance.sol";

interface IGelato1Balance {
    struct Gelato1BalanceParam {
        address sponsor;
        address feeToken;
        uint256 oneBalanceChainId;
        uint256 nativeToFeeTokenXRateNumerator;
        uint256 nativeToFeeTokenXRateDenominator;
        bytes32 correlationId;
    }

    event LogUseGelato1Balance(
        address indexed sponsor,
        address indexed target,
        address indexed feeToken,
        uint256 oneBalanceChainId,
        uint256 nativeToFeeTokenXRateNumerator,
        uint256 nativeToFeeTokenXRateDenominator,
        bytes32 correlationId
    );
}
