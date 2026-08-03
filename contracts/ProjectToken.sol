// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Capped token minted only by the bonding curve.
contract ProjectToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000 ether;
    address public minter;

    error NotMinter();
    error MinterAlreadySet();
    error MaxSupplyExceeded();

    constructor() ERC20("Mystery Token", "MYST") Ownable(msg.sender) {}

    function setMinter(address newMinter) external onlyOwner {
        if (minter != address(0)) revert MinterAlreadySet();
        minter = newMinter;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        _burn(account, amount);
    }
}
