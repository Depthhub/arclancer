ArcLancer

Open-source payment and trust infrastructure for freelance work and agent-to-agent commerce.

ArcLancer enables clients and freelancers to work through milestone-based onchain escrow. Clients fund a deal upfront, freelancers deliver the work, and approved milestones are released through smart contracts.

The project is also being developed as infrastructure for autonomous agents to discover services, create agreements, and settle payments programmatically.

What ArcLancer Does

- Create freelance deals with defined milestones
- Fund milestones using stablecoins
- Hold funds in smart-contract escrow
- Submit deliverables for approval
- Release payments when milestones are approved
- Support cancellation and dispute flows
- Automatically release inactive deals after a defined period
- Manage deals through Telegram
- Support wallet-based interactions
- Provide infrastructure for agent-to-agent transactions

Architecture

ArcLancer combines:

- Smart contracts for non-custodial milestone escrow
- Backend services for deal and application logic
- Telegram integration for conversational deal management
- Stablecoin payments for settlement
- Agent infrastructure for programmable commerce

The goal is to provide a reusable settlement layer that developers can build on instead of creating payment and trust infrastructure from scratch.

Core Flow

Client
   │
   ▼
Create Deal
   │
   ▼
Fund Escrow
   │
   ▼
Freelancer Delivers
   │
   ▼
Client Approves
   │
   ▼
Smart Contract Releases Payment
   │
   ▼
Freelancer

Telegram Deal Copilot

ArcLancer includes a Telegram interface for managing deals without requiring users to interact directly with a traditional web dashboard.

The Copilot is designed to support actions such as:

- Creating deals
- Editing deal terms
- Checking wallet balances
- Funding escrow
- Submitting milestones
- Approving milestones
- Releasing payments
- Cancelling deals
- Opening disputes
- Querying existing contracts

Agent Commerce

A major direction of ArcLancer is programmable commerce between AI agents.

The infrastructure is being designed so agents can:

1. Discover available services
2. Identify a provider
3. Create a deal
4. Fund the required escrow
5. Submit or receive work
6. Verify completion
7. Settle payment automatically

This creates a foundation for machine-to-machine commerce where payment and trust can be handled programmatically.

Development Status

ArcLancer is under active development.

The current implementation includes the core milestone escrow flow and supporting application infrastructure. Additional integrations, testing, documentation, and security improvements are ongoing.

Getting Started

Clone the repository:

git clone https://github.com/Depthhub/arclancer.git
cd arclancer

Install dependencies:

npm install

Create your environment file:

cp .env.example .env

Add the required environment variables and follow the project-specific setup instructions.

«Never commit private keys, API keys, wallet credentials, or other secrets to the repository.»

Contributing

Contributions are welcome.

If you find a bug, have an improvement, or want to contribute a feature, please open an issue or submit a pull request.

Before contributing, read:

- "CONTRIBUTING.md"
- "SECURITY.md"

Security

ArcLancer involves payment infrastructure and smart contracts. Security issues should not be reported publicly through GitHub issues.

Please follow the instructions in "SECURITY.md" for responsible disclosure.

License

ArcLancer is released under the MIT License.

See ""LICENSE"" (./LICENSE) for details.

---

Built as open infrastructure for programmable work, payments, and trust.
