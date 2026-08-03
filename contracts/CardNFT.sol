// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CardNFT is ERC1155, Ownable {
    address public packContract;
    mapping(uint256 => uint256) public tokenReward;

    error NotPackContract();
    error PackContractAlreadySet();

    constructor(string memory baseURI) ERC1155(baseURI) Ownable(msg.sender) {
        tokenReward[0] = 25 ether;  // common
        tokenReward[1] = 75 ether;  // rare
        tokenReward[2] = 200 ether; // epic
        tokenReward[3] = 500 ether; // legendary
    }

    function setPackContract(address account) external onlyOwner {
        if (packContract != address(0)) revert PackContractAlreadySet();
        packContract = account;
    }

    function mint(address to, uint256 rarity) external {
        if (msg.sender != packContract) revert NotPackContract();
        _mint(to, rarity, 1, "");
    }
}
