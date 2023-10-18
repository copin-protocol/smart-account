// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

abstract contract GelatoAutomate {
    address public immutable GELATO;
    address public immutable AUTOMATE;
    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    constructor(address _gelato, address _automate) {
        GELATO = _gelato;
        AUTOMATE = _automate;
    }

    function _transfer(uint256 _amount) internal {
        (bool success, ) = GELATO.call{value: _amount}("");
        require(success, "GelatoAutomate: ETH transfer failed");
    }
}
