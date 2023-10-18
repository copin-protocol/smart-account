// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAccountGMX {
    struct ConstructorParams {
        address factory;
        address events;
        address configs;
        address marginAsset;
        address trustedForwarder;
        address gelato;
        address automate;
        address router;
        address positionRouter;
    }
}
