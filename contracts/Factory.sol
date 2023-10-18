// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {AccountProxy} from "contracts/AccountProxy.sol";
import {IFactory} from "contracts/interfaces/IFactory.sol";
import {Owned} from "contracts/utils/Owned.sol";

contract Factory is IFactory, Owned {
    bool public canUpgrade = true;

    address public implementation;

    mapping(address accounts => bool exist) public accounts;

    mapping(address owner => address[] accounts) internal ownerAccounts;

    constructor(address _owner) Owned(_owner) {}

    function getAccountOwner(
        address _account
    ) public view override returns (address) {
        if (!accounts[_account]) revert AccountDoesNotExist();
        (bool success, bytes memory data) = _account.staticcall(
            abi.encodeWithSignature("owner()")
        );
        assert(success);
        return abi.decode(data, (address));
    }

    function getAccountsOwnedBy(
        address _owner
    ) external view override returns (address[] memory) {
        return ownerAccounts[_owner];
    }

    function updateAccountOwnership(
        address _newOwner,
        address _oldOwner
    ) external override {
        if (!accounts[msg.sender]) revert AccountDoesNotExist();
        uint256 length = ownerAccounts[_oldOwner].length;

        for (uint256 i = 0; i < length; ) {
            if (ownerAccounts[_oldOwner][i] == msg.sender) {
                ownerAccounts[_oldOwner][i] = ownerAccounts[_oldOwner][
                    length - 1
                ];
                ownerAccounts[_oldOwner].pop();
                ownerAccounts[_newOwner].push(msg.sender);

                return;
            }

            unchecked {
                ++i;
            }
        }
    }

    function newAccount(
        address initialDelegate
    ) external override returns (address payable accountAddress) {
        accountAddress = payable(address(new AccountProxy(address(this))));
        accounts[accountAddress] = true;
        ownerAccounts[msg.sender].push(accountAddress);

        (bool success, bytes memory data) = accountAddress.call(
            abi.encodeWithSignature("setInitialOwnership(address)", msg.sender)
        );
        if (!success) revert FailedToSetAccountOwner(data);

        if (initialDelegate != address(0)) {
            (success, data) = accountAddress.call(
                abi.encodeWithSignature(
                    "addInitialDelegate(address)",
                    initialDelegate
                )
            );
            if (!success) revert FailedToAddAccountDelegate(data);
        }

        (success, data) = accountAddress.call(
            abi.encodeWithSignature("VERSION()")
        );
        if (!success) revert AccountFailedToFetchVersion(data);

        emit NewAccount({
            creator: msg.sender,
            account: accountAddress,
            version: abi.decode(data, (bytes32))
        });
    }

    function upgradeAccountImplementation(
        address _implementation
    ) external override onlyOwner {
        if (!canUpgrade) revert CannotUpgrade();
        implementation = _implementation;
        emit AccountImplementationUpgraded({implementation: _implementation});
    }

    function removeUpgradability() external override onlyOwner {
        canUpgrade = false;
    }
}
