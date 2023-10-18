// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MarginAsset is ERC20 {
    uint256 mintedAmount;
    mapping(address => bool) mintedAddresses;

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    constructor(uint256 amountToMint) ERC20("USD", "MarginAsset") {
        _mint(msg.sender, amountToMint);
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}
