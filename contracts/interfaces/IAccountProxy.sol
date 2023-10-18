// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAccountProxy {
    /// @dev thrown if beacon is not set to a valid address
    error BeaconNotSet();

    /// @dev thrown if implementation is not set to a valid address
    error ImplementationNotSet();

    /// @dev thrown if beacon call fails
    error BeaconCallFailed();
}
