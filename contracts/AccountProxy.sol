// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IAccountProxy} from "contracts/interfaces/IAccountProxy.sol";

/// The beacon address is stored in the storage slot
/// `uint256(keccak256('eip1967.proxy.beacon')) - 1`, so that it doesn't
/// conflict with the storage layout of the implementation behind this proxy.
contract AccountProxy is IAccountProxy {
    bytes32 internal constant _BEACON_STORAGE_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1);

    struct AddressSlot {
        address value;
    }

    function _getAddressSlot(
        bytes32 slot
    ) internal pure returns (AddressSlot storage r) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            r.slot := slot
        }
    }

    constructor(address _beaconAddress) {
        _getAddressSlot(_BEACON_STORAGE_SLOT).value = _beaconAddress;
    }

    function _beacon() internal view returns (address beacon) {
        beacon = _getAddressSlot(_BEACON_STORAGE_SLOT).value;
        if (beacon == address(0)) revert BeaconNotSet();
    }

    function _implementation() internal returns (address implementation) {
        (bool success, bytes memory data) = _beacon().call(
            abi.encodeWithSignature("implementation()")
        );
        if (!success) revert BeaconCallFailed();
        implementation = abi.decode(data, (address));
        if (implementation == address(0)) revert ImplementationNotSet();
    }

    /// @dev Fallback function that delegates calls to the address returned by `_implementation()`.
    /// Will run if no other function in the contract matches the call data.
    fallback() external payable {
        _fallback();
    }

    /// @dev Fallback function that delegates calls to the address returned by `_implementation()`.
    /// Will run if call data is empty.
    receive() external payable {
        _fallback();
    }

    /// @dev This function does not return to its internal call site,
    /// it will return directly to the external caller.
    function _fallback() internal {
        _delegate(_implementation());
    }

    /// @dev This function does not return to its internal call site,
    /// it will return directly to the external caller.
    function _delegate(address implementation) internal virtual {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(
                gas(),
                implementation,
                0,
                calldatasize(),
                0,
                0
            )

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())
            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}
