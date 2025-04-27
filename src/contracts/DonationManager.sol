// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DonationManager is ReentrancyGuard, Ownable {
    struct Transaction {
        address recipient;
        uint256 amount;
        string purpose;
        bool executed;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    address[] public approvers;
    uint256 public requiredApprovals;
    uint256 public transactionCount;
    mapping(uint256 => Transaction) public transactions;

    event TransactionCreated(
        uint256 indexed transactionId,
        address recipient,
        uint256 amount,
        string purpose
    );
    event TransactionApproved(
        uint256 indexed transactionId,
        address approver
    );
    event TransactionExecuted(
        uint256 indexed transactionId,
        address recipient,
        uint256 amount
    );

    constructor(address[] memory _approvers, uint256 _requiredApprovals) {
        require(_approvers.length >= _requiredApprovals, "Invalid approver count");
        approvers = _approvers;
        requiredApprovals = _requiredApprovals;
    }

    modifier onlyApprover() {
        bool isApprover = false;
        for (uint i = 0; i < approvers.length; i++) {
            if (approvers[i] == msg.sender) {
                isApprover = true;
                break;
            }
        }
        require(isApprover, "Not an approver");
        _;
    }

    function createTransaction(
        address recipient,
        uint256 amount,
        string memory purpose
    ) 
        public 
        onlyApprover 
        returns (uint256) 
    {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        uint256 transactionId = transactionCount++;
        Transaction storage newTx = transactions[transactionId];
        newTx.recipient = recipient;
        newTx.amount = amount;
        newTx.purpose = purpose;
        newTx.executed = false;
        newTx.approvalCount = 0;

        emit TransactionCreated(transactionId, recipient, amount, purpose);
        return transactionId;
    }

    function approveTransaction(uint256 transactionId) 
        public 
        onlyApprover 
        nonReentrant 
    {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(!transaction.approvals[msg.sender], "Already approved");

        transaction.approvals[msg.sender] = true;
        transaction.approvalCount++;

        emit TransactionApproved(transactionId, msg.sender);

        if (transaction.approvalCount >= requiredApprovals) {
            executeTransaction(transactionId);
        }
    }

    function executeTransaction(uint256 transactionId) 
        private 
    {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(
            transaction.approvalCount >= requiredApprovals,
            "Insufficient approvals"
        );
        require(
            address(this).balance >= transaction.amount,
            "Insufficient balance"
        );

        transaction.executed = true;

        (bool success, ) = transaction.recipient.call{value: transaction.amount}("");
        require(success, "Transfer failed");

        emit TransactionExecuted(
            transactionId,
            transaction.recipient,
            transaction.amount
        );
    }

    function getTransaction(uint256 transactionId) 
        public 
        view 
        returns (
            address recipient,
            uint256 amount,
            string memory purpose,
            bool executed,
            uint256 approvalCount
        ) 
    {
        Transaction storage transaction = transactions[transactionId];
        return (
            transaction.recipient,
            transaction.amount,
            transaction.purpose,
            transaction.executed,
            transaction.approvalCount
        );
    }

    function isApproved(uint256 transactionId, address approver) 
        public 
        view 
        returns (bool) 
    {
        return transactions[transactionId].approvals[approver];
    }

    receive() external payable {
        // Accept ETH transfers
    }
}