// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IFactory {
    event NewAccount(
        address indexed creator,
        address indexed account,
        bytes32 version
    );

    event AccountImplementationUpgraded(address implementation);

    error FailedToSetAccountOwner(bytes data);

    error FailedToAddAccountDelegate(bytes data);

    error AccountFailedToFetchVersion(bytes data);

    error CannotUpgrade();

    error AccountDoesNotExist();

    function canUpgrade() external view returns (bool);

    function implementation() external view returns (address);

    function accounts(address _account) external view returns (bool);

    function getAccountOwner(address _account) external view returns (address);

    function getAccountsOwnedBy(
        address _owner
    ) external view returns (address[] memory);

    function updateAccountOwnership(
        address _newOwner,
        address _oldOwner
    ) external;

    function newAccount(
        address initialDelegate
    ) external returns (address payable accountAddress);

    /// @dev this *will* impact all existing accounts
    /// @dev future accounts will also point to this new implementation (until
    /// upgradeAccountImplementation() is called again with a newer implementation)
    /// @dev *DANGER* this function does not check the new implementation for validity,
    /// thus, a bad upgrade could result in severe consequences.
    function upgradeAccountImplementation(address _implementation) external;

    /// @dev cannot be undone
    function removeUpgradability() external;
}
