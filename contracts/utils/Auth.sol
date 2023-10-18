// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @author JaredBorders (jaredborders@pm.me)
/// @dev This contract is intended to be inherited by the Account contract
abstract contract Auth {
    address public owner;

    mapping(address delegate => bool) public delegates;

    /// @dev reserved storage space for future contract upgrades
    /// @custom:caution reduce storage size when adding new storage variables
    uint256[19] private __gap;

    error Unauthorized();

    error InvalidDelegateAddress(address delegateAddress);

    event OwnershipTransferred(
        address indexed caller,
        address indexed newOwner
    );

    event DelegatedAccountAdded(
        address indexed caller,
        address indexed delegate
    );

    event DelegatedAccountRemoved(
        address indexed caller,
        address indexed delegate
    );

    /// @dev sets owner to _owner and not msg.sender
    constructor(address _owner) {
        owner = _owner;

        emit OwnershipTransferred(address(0), _owner);
    }

    function isOwner(address msgSender) public view virtual returns (bool) {
        return (msgSender == owner);
    }

    function isAuth(address msgSender) public view virtual returns (bool) {
        return (msgSender == owner || delegates[msgSender]);
    }

    /// @dev only owner can transfer ownership (not delegates)
    function transferOwnership(address _newOwner) public virtual {
        if (!isOwner(msg.sender)) revert Unauthorized();

        owner = _newOwner;

        emit OwnershipTransferred(msg.sender, _newOwner);
    }

    /// @dev only owner can add a delegate (not delegates)
    function addDelegate(address _delegate) public virtual {
        if (!isOwner(msg.sender)) revert Unauthorized();

        if (_delegate == address(0) || delegates[_delegate]) {
            revert InvalidDelegateAddress(_delegate);
        }

        delegates[_delegate] = true;

        emit DelegatedAccountAdded({caller: msg.sender, delegate: _delegate});
    }

    /// @dev only owner can remove a delegate (not delegates)
    function removeDelegate(address _delegate) public virtual {
        if (!isOwner(msg.sender)) revert Unauthorized();

        if (_delegate == address(0) || !delegates[_delegate]) {
            revert InvalidDelegateAddress(_delegate);
        }

        delete delegates[_delegate];

        emit DelegatedAccountRemoved({caller: msg.sender, delegate: _delegate});
    }
}
