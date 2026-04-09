// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./EscrowContract.sol";

/**
 * @title EscrowFactory
 * @author ArcLancer
 * @notice Factory contract for deploying individual escrow contracts
 * @dev Manages platform fees and tracks all deployed contracts
 */
contract EscrowFactory is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    /// @notice Milestone input structure for contract creation
    struct MilestoneInput {
        uint256 amount;
        string description;
    }

    // ============ State Variables ============

    /// @notice Address of the USDC token
    address public immutable usdcToken;
    
    /// @notice Address of the StableFX contract
    address public stableFX;
    
    /// @notice Platform fee in basis points (100 = 1%)
    uint256 public platformFeePercentage;
    
    /// @notice Address that receives platform fees
    address public feeCollector;
    
    /// @notice Total number of contracts created
    uint256 public contractCount;
    
    /// @notice Mapping of user address to their contract addresses
    mapping(address => address[]) public userContracts;
    
    /// @notice All deployed contract addresses
    address[] public allContracts;

    // ============ Events ============

    /// @notice Emitted when a new escrow contract is created
    event ContractCreated(
        address indexed contractAddress,
        address indexed client,
        address indexed freelancer,
        uint256 totalAmount,
        uint256 feeAmount,
        uint256 milestoneCount
    );
    
    /// @notice Emitted when platform fee is collected
    event FeeCollected(
        address indexed contractAddress,
        uint256 feeAmount
    );
    
    /// @notice Emitted when platform fee percentage is updated
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /// @notice Emitted when fee collector is updated
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    
    /// @notice Emitted when StableFX address is updated
    event StableFXUpdated(address oldAddress, address newAddress);

    // ============ Constructor ============

    /**
     * @notice Initialize the factory
     * @param _usdcToken Address of USDC token
     * @param _stableFX Address of StableFX contract
     * @param _feeCollector Address to receive platform fees
     * @param _initialOwner Address of the initial owner
     */
    constructor(
        address _usdcToken,
        address _stableFX,
        address _feeCollector,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_feeCollector != address(0), "Invalid fee collector");
        
        usdcToken = _usdcToken;
        stableFX = _stableFX;
        feeCollector = _feeCollector;
        platformFeePercentage = 200; // 2% = 200 basis points
    }

    // ============ Core Functions ============

    /**
     * @notice Create a new escrow contract
     * @param freelancer Address of the freelancer
     * @param totalAmount Total contract amount in USDC
     * @param payoutCurrency Address of payout currency (for StableFX conversion)
     * @param milestones Array of milestone inputs (amounts and descriptions)
     * @return contractAddress Address of the newly created contract
     */
    function createEscrowContract(
        address freelancer,
        uint256 totalAmount,
        address payoutCurrency,
        MilestoneInput[] calldata milestones
    ) external whenNotPaused nonReentrant returns (address contractAddress) {
        require(freelancer != address(0), "Invalid freelancer address");
        require(freelancer != msg.sender, "Cannot create contract with self");
        require(totalAmount > 0, "Amount must be > 0");
        require(milestones.length > 0, "Must have milestones");
        
        // Calculate platform fee
        uint256 feeAmount = (totalAmount * platformFeePercentage) / 10000;
        uint256 netAmount = totalAmount - feeAmount;
        
        // Prepare milestone arrays for EscrowContract
        uint256[] memory milestoneAmounts = new uint256[](milestones.length);
        string[] memory milestoneDescriptions = new string[](milestones.length);
        
        uint256 milestoneSum = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            require(milestones[i].amount > 0, "Milestone amount must be > 0");
            milestoneAmounts[i] = milestones[i].amount;
            milestoneDescriptions[i] = milestones[i].description;
            milestoneSum += milestones[i].amount;
        }
        require(milestoneSum == netAmount, "Milestone amounts must equal net amount");
        
        // Collect platform fee from client
        if (feeAmount > 0) {
            IERC20(usdcToken).safeTransferFrom(msg.sender, feeCollector, feeAmount);
            emit FeeCollected(address(0), feeAmount); // Address will be updated below
        }
        
        // Deploy new EscrowContract
        EscrowContract newContract = new EscrowContract(
            msg.sender,           // client
            freelancer,
            usdcToken,
            netAmount,            // Amount after fee
            payoutCurrency,
            stableFX,
            milestoneAmounts,
            milestoneDescriptions
        );
        
        contractAddress = address(newContract);
        
        // Track contract
        userContracts[msg.sender].push(contractAddress);
        userContracts[freelancer].push(contractAddress);
        allContracts.push(contractAddress);
        contractCount++;
        
        emit ContractCreated(
            contractAddress,
            msg.sender,
            freelancer,
            totalAmount,
            feeAmount,
            milestones.length
        );
        
        return contractAddress;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update the platform fee percentage
     * @param newFee New fee in basis points (max 1000 = 10%)
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high (max 10%)");
        
        uint256 oldFee = platformFeePercentage;
        platformFeePercentage = newFee;
        
        emit PlatformFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update the fee collector address
     * @param newCollector New fee collector address
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid address");
        
        address oldCollector = feeCollector;
        feeCollector = newCollector;
        
        emit FeeCollectorUpdated(oldCollector, newCollector);
    }

    /**
     * @notice Update the StableFX contract address
     * @param newStableFX New StableFX address
     */
    function setStableFX(address newStableFX) external onlyOwner {
        address oldAddress = stableFX;
        stableFX = newStableFX;
        
        emit StableFXUpdated(oldAddress, newStableFX);
    }

    /**
     * @notice Pause contract creation
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract creation
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get all contracts for a user
     * @param user User address
     */
    function getUserContracts(address user) external view returns (address[] memory) {
        return userContracts[user];
    }

    /**
     * @notice Get count of contracts for a user
     * @param user User address
     */
    function getUserContractCount(address user) external view returns (uint256) {
        return userContracts[user].length;
    }

    /**
     * @notice Get all deployed contracts
     */
    function getAllContracts() external view returns (address[] memory) {
        return allContracts;
    }

    /**
     * @notice Get total contract count
     */
    function getContractCount() external view returns (uint256) {
        return contractCount;
    }

    /**
     * @notice Calculate fee for a given amount
     * @param amount Total amount in USDC
     */
    function calculateFee(uint256 amount) external view returns (uint256 fee, uint256 netAmount) {
        fee = (amount * platformFeePercentage) / 10000;
        netAmount = amount - fee;
    }
}
