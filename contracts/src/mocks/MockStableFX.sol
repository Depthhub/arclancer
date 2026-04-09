// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IStableFX.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockStableFX
 * @notice Mock StableFX implementation for testing
 * @dev Returns fixed rates for testing currency conversions
 */
contract MockStableFX is IStableFX {
    mapping(address => mapping(address => uint256)) public rates;

    constructor() {
        // Default rates will be set via setRate function
    }

    /**
     * @notice Set exchange rate between two tokens (for testing)
     * @param fromToken Source token
     * @param toToken Destination token
     * @param rate Rate with 18 decimals (e.g., 5.8 = 5.8e18)
     */
    function setRate(address fromToken, address toToken, uint256 rate) external {
        rates[fromToken][toToken] = rate;
    }

    /// @inheritdoc IStableFX
    function getQuote(
        address fromToken,
        address toToken,
        uint256 amount
    ) external view override returns (Quote memory quote) {
        uint256 rate = rates[fromToken][toToken];
        require(rate > 0, "Pair not supported");
        
        uint256 fee = (amount * 20) / 10000; // 0.2% fee
        uint256 outputAmount = ((amount - fee) * rate) / 1e18;
        
        quote = Quote({
            fromToken: fromToken,
            toToken: toToken,
            inputAmount: amount,
            outputAmount: outputAmount,
            rate: rate,
            fee: fee,
            validUntil: block.timestamp + 60 // Valid for 60 seconds
        });
    }

    /// @inheritdoc IStableFX
    function executeSwap(
        Quote calldata quote,
        address recipient
    ) external override returns (uint256 outputAmount) {
        require(block.timestamp <= quote.validUntil, "Quote expired");
        
        // Transfer input tokens from sender
        IERC20(quote.fromToken).transferFrom(msg.sender, address(this), quote.inputAmount);
        
        // Transfer output tokens to recipient (mock: just transfer input minus fee)
        // In real implementation, this would swap to the actual output token
        IERC20(quote.fromToken).transfer(recipient, quote.inputAmount - quote.fee);
        
        return quote.outputAmount;
    }

    /// @inheritdoc IStableFX
    function getRate(
        address fromToken,
        address toToken
    ) external view override returns (uint256 rate) {
        return rates[fromToken][toToken];
    }

    /// @inheritdoc IStableFX
    function isPairSupported(
        address fromToken,
        address toToken
    ) external view override returns (bool supported) {
        return rates[fromToken][toToken] > 0;
    }
}
