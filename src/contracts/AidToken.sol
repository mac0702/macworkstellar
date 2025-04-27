// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AidToken is ERC20, ReentrancyGuard, Ownable {
    struct DonationInfo {
        address donor;
        uint256 amount;
        string category;
        uint256 timestamp;
        string region;
    }

    struct GeographicRestriction {
        string region;
        bool active;
    }

    mapping(uint256 => DonationInfo) public donations;
    mapping(string => GeographicRestriction) public restrictions;
    uint256 public donationCount;
    bool public emergencyStop;

    event DonationReceived(
        address indexed donor,
        uint256 amount,
        string category,
        string region,
        uint256 timestamp
    );

    event FundsDistributed(
        address indexed recipient,
        uint256 amount,
        string category,
        string region,
        uint256 timestamp
    );

    modifier whenNotStopped() {
        require(!emergencyStop, "Contract is paused");
        _;
    }

    constructor() ERC20("AidLink Token", "AID") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function donate(string memory category, string memory region) 
        public 
        payable 
        whenNotStopped 
        nonReentrant 
    {
        require(msg.value > 0, "Donation amount must be greater than 0");
        require(restrictions[region].active, "Region not approved for donations");

        uint256 tokenAmount = msg.value;
        _mint(msg.sender, tokenAmount);

        donations[donationCount] = DonationInfo({
            donor: msg.sender,
            amount: msg.value,
            category: category,
            timestamp: block.timestamp,
            region: region
        });

        emit DonationReceived(
            msg.sender,
            msg.value,
            category,
            region,
            block.timestamp
        );

        donationCount++;
    }

    function distribute(
        address recipient,
        uint256 amount,
        string memory category,
        string memory region
    ) 
        public 
        onlyOwner 
        whenNotStopped 
        nonReentrant 
    {
        require(amount > 0, "Amount must be greater than 0");
        require(restrictions[region].active, "Region not approved for distribution");
        require(address(this).balance >= amount, "Insufficient contract balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsDistributed(
            recipient,
            amount,
            category,
            region,
            block.timestamp
        );
    }

    function addRegion(string memory region) public onlyOwner {
        restrictions[region].active = true;
    }

    function removeRegion(string memory region) public onlyOwner {
        restrictions[region].active = false;
    }

    function toggleEmergencyStop() public onlyOwner {
        emergencyStop = !emergencyStop;
    }

    function getDonation(uint256 id) public view returns (
        address donor,
        uint256 amount,
        string memory category,
        uint256 timestamp,
        string memory region
    ) {
        DonationInfo memory info = donations[id];
        return (
            info.donor,
            info.amount,
            info.category,
            info.timestamp,
            info.region
        );
    }

    receive() external payable {
        // Accept ETH transfers
    }
}