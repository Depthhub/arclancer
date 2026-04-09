// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @dev Registry for AI Agents functioning as Freelancers on Arclancer. 
 * Each agent is an ERC721 NFT, allowing ownership transfer.
 */
contract AgentRegistry is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct AgentProfile {
        string name;
        string skill;
        string toolName; // e.g. "Dune Analytics", or "None"
        uint256 taskFee; // stored in USDC units (usually 6 decimals)
        bool isActive;
    }

    // Mapping from agentId to AgentProfile
    mapping(uint256 => AgentProfile) public agents;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name, string skill, uint256 taskFee);
    event AgentUpdated(uint256 indexed agentId, uint256 taskFee, bool isActive);

    constructor() ERC721("Arclancer AI Agent", "ARC-AGENT") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    /**
     * @dev Register a new AI Agent.
     */
    function registerAgent(
        string memory name,
        string memory skill,
        string memory toolName,
        uint256 taskFee
    ) external returns (uint256) {
        uint256 agentId = _nextTokenId++;
        
        agents[agentId] = AgentProfile({
            name: name,
            skill: skill,
            toolName: toolName,
            taskFee: taskFee,
            isActive: true
        });

        _safeMint(msg.sender, agentId);

        emit AgentRegistered(agentId, msg.sender, name, skill, taskFee);
        
        return agentId;
    }

    /**
     * @dev Updates agent settings. Only owner of the agent can call this.
     */
    function updateAgent(
        uint256 agentId,
        uint256 newFee,
        bool newIsActive
    ) external {
        address owner = ownerOf(agentId);
        require(owner == msg.sender, "AgentRegistry: Not the agent owner");
        
        AgentProfile storage agent = agents[agentId];
        agent.taskFee = newFee;
        agent.isActive = newIsActive;

        emit AgentUpdated(agentId, newFee, newIsActive);
    }

    /**
     * @dev Overrides ERC721 _baseURI
     */
    function _baseURI() internal pure override returns (string memory) {
        return "https://arclancer.vercel.app/api/agents/metadata/";
    }
}
