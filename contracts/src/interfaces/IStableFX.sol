// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStableFX
 * @notice Interface for Arc StableFX multi-currency swap functionality
 * @dev This interface allows conversion between stablecoins on Arc Network
 */
interface IStableFX {
    /// @notice Quote structure for FX conversions
    struct Quote {
        address fromToken;
        address toToken;
        uint256 inputAmount;
        uint256 outputAmount;
        uint256 rate;
        uint256 fee;
        uint256 validUntil;
    }

    /// @notice Get a quote for swapping between stablecoins
    /// @param fromToken Address of the source token
    /// @param toToken Address of the destination token
    /// @param amount Amount of source token to swap
    /// @return quote The quote details
    function getQuote(
        address fromToken,
        address toToken,
        uint256 amount
    ) external view returns (Quote memory quote);

    /// @notice Execute a swap based on a quote
    /// @param quote The quote to execute
    /// @param recipient Address to receive the output tokens
    /// @return outputAmount The amount of tokens received
    function executeSwap(
        Quote calldata quote,
        address recipient
    ) external returns (uint256 outputAmount);

    /// @notice Get the current exchange rate between two tokens
    /// @param fromToken Source token address
    /// @param toToken Destination token address
    /// @return rate The exchange rate (18 decimals)
    function getRate(
        address fromToken,
        address toToken
    ) external view returns (uint256 rate);

    /// @notice Check if a token pair is supported
    /// @param fromToken Source token address
    /// @param toToken Destination token address
    /// @return supported True if the pair is supported
    function isPairSupported(
        address fromToken,
        address toToken
    ) external view returns (bool supported);
}
