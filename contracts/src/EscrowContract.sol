// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IStableFX.sol";

/**
 * @title EscrowContract
 * @author ArcLancer
 * @notice Individual escrow contract managing milestone-based freelance payments
 * @dev Deployed by EscrowFactory for each freelance agreement
 */
contract EscrowContract is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    /// @notice Milestone information structure
    struct Milestone {
        uint256 amount;           // Amount in USDC for this milestone
        string description;       // Description of the work required
        string deliverableURI;    // IPFS hash for submitted deliverable
        bool submitted;           // Has freelancer submitted work?
        bool approved;            // Has client approved the work?
        bool paid;                // Has payment been released?
        uint256 submittedAt;      // Timestamp of submission
        uint256 approvedAt;       // Timestamp of approval
    }

    // ============ Enums ============

    /// @notice Contract status states
    enum ContractStatus {
        ACTIVE,      // Contract is active and ongoing
        COMPLETED,   // All milestones paid, contract completed
        DISPUTED,    // Dispute has been initiated
        CANCELLED    // Contract was cancelled
    }

    // ============ State Variables ============

    /// @notice Address of the client (payer)
    address public immutable client;
    
    /// @notice Address of the freelancer (payee)
    address public immutable freelancer;
    
    /// @notice Address of the USDC token
    address public immutable usdcToken;
    
    /// @notice Address of the EscrowFactory
    address public immutable factory;
    
    /// @notice Currency address for StableFX payout (address(0) or usdcToken for direct USDC)
    address public payoutCurrency;
    
    /// @notice Total contract amount in USDC
    uint256 public totalAmount;
    
    /// @notice Total amount paid out so far
    uint256 public totalPaid;
    
    /// @notice Whether the contract has been funded
    bool public funded;
    
    /// @notice Array of milestones
    Milestone[] public milestones;
    
    /// @notice Current status of the contract
    ContractStatus public status;
    
    /// @notice Arbitrator address (set when dispute is initiated)
    address public arbitrator;
    
    /// @notice StableFX interface for currency conversions
    IStableFX public stableFX;
    
    /// @notice Auto-approval period (7 days)
    uint256 public constant AUTO_APPROVE_PERIOD = 7 days;

    // ============ Events ============

    /// @notice Emitted when the contract is funded
    event ContractFunded(uint256 amount, uint256 timestamp);
    
    /// @notice Emitted when a milestone is submitted
    event MilestoneSubmitted(uint256 indexed milestoneIndex, string deliverableURI, uint256 timestamp);
    
    /// @notice Emitted when a milestone is approved by client
    event MilestoneApproved(uint256 indexed milestoneIndex, uint256 timestamp);
    
    /// @notice Emitted when a milestone is auto-approved after 7 days
    event MilestoneAutoApproved(uint256 indexed milestoneIndex, uint256 timestamp);
    
    /// @notice Emitted when payment is released
    event PaymentReleased(uint256 indexed milestoneIndex, uint256 amount, address currency, uint256 timestamp);
    
    /// @notice Emitted when FX conversion is executed
    event FXConversionExecuted(
        address indexed fromCurrency,
        address indexed toCurrency,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 rate
    );
    
    /// @notice Emitted when a dispute is initiated
    event DisputeInitiated(address indexed initiator, uint256 timestamp);
    
    /// @notice Emitted when contract is cancelled
    event ContractCancelled(uint256 refundAmount, uint256 timestamp);
    
    /// @notice Emitted when freelancer changes payout currency
    event PayoutCurrencyChanged(address indexed oldCurrency, address indexed newCurrency, uint256 timestamp);

    // ============ Modifiers ============

    /// @notice Restricts function to client only
    modifier onlyClient() {
        require(msg.sender == client, "Only client can call");
        _;
    }

    /// @notice Restricts function to freelancer only
    modifier onlyFreelancer() {
        require(msg.sender == freelancer, "Only freelancer can call");
        _;
    }

    /// @notice Restricts function to client or freelancer
    modifier onlyParticipant() {
        require(msg.sender == client || msg.sender == freelancer, "Only participant can call");
        _;
    }

    /// @notice Requires contract to be active
    modifier whenActive() {
        require(status == ContractStatus.ACTIVE, "Contract not active");
        _;
    }

    /// @notice Requires contract to be funded
    modifier whenFunded() {
        require(funded, "Contract not funded");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize a new escrow contract
     * @param _client Address of the client
     * @param _freelancer Address of the freelancer
     * @param _usdcToken Address of USDC token
     * @param _totalAmount Total contract amount in USDC
     * @param _payoutCurrency Address of payout currency (for StableFX)
     * @param _stableFX Address of StableFX contract
     * @param _milestoneAmounts Array of milestone amounts
     * @param _milestoneDescriptions Array of milestone descriptions
     */
    constructor(
        address _client,
        address _freelancer,
        address _usdcToken,
        uint256 _totalAmount,
        address _payoutCurrency,
        address _stableFX,
        uint256[] memory _milestoneAmounts,
        string[] memory _milestoneDescriptions
    ) {
        require(_client != address(0), "Invalid client address");
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_client != _freelancer, "Client and freelancer must differ");
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_totalAmount > 0, "Amount must be > 0");
        require(_milestoneAmounts.length > 0, "Must have milestones");
        require(_milestoneAmounts.length == _milestoneDescriptions.length, "Arrays length mismatch");

        client = _client;
        freelancer = _freelancer;
        usdcToken = _usdcToken;
        factory = msg.sender;
        totalAmount = _totalAmount;
        payoutCurrency = _payoutCurrency == address(0) ? _usdcToken : _payoutCurrency;
        stableFX = IStableFX(_stableFX);
        status = ContractStatus.ACTIVE;

        // Validate milestone amounts sum to total
        uint256 sum = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            sum += _milestoneAmounts[i];
            
            milestones.push(Milestone({
                amount: _milestoneAmounts[i],
                description: _milestoneDescriptions[i],
                deliverableURI: "",
                submitted: false,
                approved: false,
                paid: false,
                submittedAt: 0,
                approvedAt: 0
            }));
        }
        require(sum == _totalAmount, "Milestone amounts must equal total");
    }

    // ============ Core Functions ============

    /**
     * @notice Fund the contract with USDC
     * @dev Only callable by client, transfers full amount
     */
    function fundContract() external onlyClient whenActive nonReentrant {
        require(!funded, "Already funded");
        
        IERC20(usdcToken).safeTransferFrom(client, address(this), totalAmount);
        funded = true;
        
        emit ContractFunded(totalAmount, block.timestamp);
    }

    /**
     * @notice Submit work for a milestone
     * @param milestoneIndex Index of the milestone
     * @param deliverableURI IPFS hash of the deliverable
     */
    function submitMilestone(
        uint256 milestoneIndex,
        string calldata deliverableURI
    ) external onlyFreelancer whenActive whenFunded {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        require(bytes(deliverableURI).length > 0, "Deliverable URI required");
        
        Milestone storage milestone = milestones[milestoneIndex];
        require(!milestone.submitted, "Already submitted");
        
        milestone.submitted = true;
        milestone.deliverableURI = deliverableURI;
        milestone.submittedAt = block.timestamp;
        
        emit MilestoneSubmitted(milestoneIndex, deliverableURI, block.timestamp);
    }

    /**
     * @notice Approve a submitted milestone
     * @param milestoneIndex Index of the milestone to approve
     */
    function approveMilestone(uint256 milestoneIndex) external onlyClient whenActive whenFunded {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = milestones[milestoneIndex];
        require(milestone.submitted, "Not submitted yet");
        require(!milestone.approved, "Already approved");
        
        milestone.approved = true;
        milestone.approvedAt = block.timestamp;
        
        emit MilestoneApproved(milestoneIndex, block.timestamp);
    }

    /**
     * @notice Auto-approve a milestone after 7 days
     * @param milestoneIndex Index of the milestone
     */
    function autoApproveMilestone(uint256 milestoneIndex) external whenActive whenFunded {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = milestones[milestoneIndex];
        require(milestone.submitted, "Not submitted yet");
        require(!milestone.approved, "Already approved");
        require(
            block.timestamp >= milestone.submittedAt + AUTO_APPROVE_PERIOD,
            "Auto-approve period not passed"
        );
        
        milestone.approved = true;
        milestone.approvedAt = block.timestamp;
        
        emit MilestoneAutoApproved(milestoneIndex, block.timestamp);
    }

    /**
     * @notice Release payment for an approved milestone
     * @param milestoneIndex Index of the milestone
     */
    function releaseMilestonePayment(uint256 milestoneIndex) external whenActive whenFunded nonReentrant {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = milestones[milestoneIndex];
        require(milestone.approved, "Not approved yet");
        require(!milestone.paid, "Already paid");
        
        milestone.paid = true;
        uint256 amount = milestone.amount;
        totalPaid += amount;
        
        // Execute payment (with StableFX conversion if needed)
        _executePayment(amount);
        
        emit PaymentReleased(milestoneIndex, amount, payoutCurrency, block.timestamp);
        
        // Check if all milestones are paid
        if (_allMilestonesPaid()) {
            status = ContractStatus.COMPLETED;
        }
    }

    /**
     * @notice Initiate a dispute
     */
    function initiateDispute() external onlyParticipant whenActive {
        status = ContractStatus.DISPUTED;
        emit DisputeInitiated(msg.sender, block.timestamp);
    }

    /**
     * @notice Cancel the contract (only if no milestones submitted)
     */
    function cancelContract() external onlyClient whenActive nonReentrant {
        // Check no milestones have been submitted
        for (uint256 i = 0; i < milestones.length; i++) {
            require(!milestones[i].submitted, "Cannot cancel after submission");
        }
        
        status = ContractStatus.CANCELLED;
        
        // Refund if funded
        if (funded) {
            uint256 balance = IERC20(usdcToken).balanceOf(address(this));
            if (balance > 0) {
                IERC20(usdcToken).safeTransfer(client, balance);
            }
            emit ContractCancelled(balance, block.timestamp);
        } else {
            emit ContractCancelled(0, block.timestamp);
        }
    }

    /**
     * @notice Allow freelancer to change payout currency before withdrawal
     * @param _newPayoutCurrency Address of the new payout currency token
     * @dev Only the freelancer can change this. Uses StableFX for conversion.
     */
    function setPayoutCurrency(address _newPayoutCurrency) external onlyFreelancer whenActive {
        require(_newPayoutCurrency != address(0), "Invalid currency address");
        
        address oldCurrency = payoutCurrency;
        
        // If changing to non-USDC, verify StableFX is available and pair is supported
        if (_newPayoutCurrency != usdcToken && address(stableFX) != address(0)) {
            require(stableFX.isPairSupported(usdcToken, _newPayoutCurrency), "Currency pair not supported");
        }
        
        payoutCurrency = _newPayoutCurrency;
        
        emit PayoutCurrencyChanged(oldCurrency, _newPayoutCurrency, block.timestamp);
    }

    // ============ Internal Functions ============

    /**
     * @notice Execute payment to freelancer (with StableFX conversion if needed)
     * @param amount Amount in USDC to pay
     */
    function _executePayment(uint256 amount) internal {
        if (payoutCurrency == usdcToken || address(stableFX) == address(0)) {
            // Direct USDC transfer
            IERC20(usdcToken).safeTransfer(freelancer, amount);
        } else {
            // StableFX conversion
            _executeStableFXConversion(amount, freelancer);
        }
    }

    /**
     * @notice Execute StableFX currency conversion
     * @param amount Amount in USDC to convert
     * @param recipient Address to receive converted tokens
     */
    function _executeStableFXConversion(uint256 amount, address recipient) internal {
        // Get quote from StableFX
        IStableFX.Quote memory quote = stableFX.getQuote(usdcToken, payoutCurrency, amount);
        
        // Approve USDC spending by StableFX
        IERC20(usdcToken).approve(address(stableFX), amount);
        
        // Execute swap
        uint256 outputAmount = stableFX.executeSwap(quote, recipient);
        
        emit FXConversionExecuted(
            usdcToken,
            payoutCurrency,
            amount,
            outputAmount,
            quote.rate
        );
    }

    /**
     * @notice Check if all milestones are paid
     */
    function _allMilestonesPaid() internal view returns (bool) {
        for (uint256 i = 0; i < milestones.length; i++) {
            if (!milestones[i].paid) {
                return false;
            }
        }
        return true;
    }

    // ============ View Functions ============

    /**
     * @notice Get milestone details
     * @param index Milestone index
     */
    function getMilestone(uint256 index) external view returns (Milestone memory) {
        require(index < milestones.length, "Invalid index");
        return milestones[index];
    }

    /**
     * @notice Get total number of milestones
     */
    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    /**
     * @notice Get all milestones
     */
    function getAllMilestones() external view returns (Milestone[] memory) {
        return milestones;
    }

    /**
     * @notice Check if a milestone can be auto-approved
     * @param index Milestone index
     */
    function canAutoApprove(uint256 index) external view returns (bool) {
        if (index >= milestones.length) return false;
        Milestone memory m = milestones[index];
        return m.submitted && !m.approved && 
               block.timestamp >= m.submittedAt + AUTO_APPROVE_PERIOD;
    }

    /**
     * @notice Get contract details
     */
    function getContractDetails() external view returns (
        address _client,
        address _freelancer,
        uint256 _totalAmount,
        uint256 _totalPaid,
        ContractStatus _status,
        uint256 _milestoneCount,
        bool _funded
    ) {
        return (
            client,
            freelancer,
            totalAmount,
            totalPaid,
            status,
            milestones.length,
            funded
        );
    }

    /**
     * @notice Preview StableFX conversion for a milestone
     * @param milestoneIndex Milestone index
     */
    function previewConversion(uint256 milestoneIndex) external view returns (
        uint256 outputAmount,
        uint256 rate,
        uint256 fee
    ) {
        require(milestoneIndex < milestones.length, "Invalid index");
        
        if (payoutCurrency == usdcToken || address(stableFX) == address(0)) {
            return (milestones[milestoneIndex].amount, 1e18, 0);
        }
        
        IStableFX.Quote memory quote = stableFX.getQuote(
            usdcToken,
            payoutCurrency,
            milestones[milestoneIndex].amount
        );
        return (quote.outputAmount, quote.rate, quote.fee);
    }
}
