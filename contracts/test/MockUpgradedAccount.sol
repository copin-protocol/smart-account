// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;
import {Auth} from "contracts/utils/Auth.sol";

contract MockUpgradedAccount is Auth {
    bytes32 public constant VERSION = "9.9.9";

    constructor() Auth(address(0)) {}

    function setInitialOwnership(address _owner) external {
        owner = _owner;
    }
}
