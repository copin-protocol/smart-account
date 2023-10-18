// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {GelatoCallUtils} from "../utils/GelatoCallUtils.sol";

contract MockTrustedForwarder {
    using GelatoCallUtils for address;

    function _encodeERC2771Context(
        bytes calldata _data,
        address _msgSender
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(_data, _msgSender);
    }

    function triggerExecute(
        address smartAccount,
        address user,
        bytes calldata data
    ) external {
        smartAccount.revertingContractCall(
            _encodeERC2771Context(data, user),
            "GelatoRelay1BalanceERC2771.sponsoredCallERC2771:"
        );
    }

    receive() external payable {}
}
