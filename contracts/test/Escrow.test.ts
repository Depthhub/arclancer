import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { EscrowFactory, EscrowContract, MockUSDC, MockStableFX } from "../typechain-types";

describe("ArcLancer Escrow System", function () {
    // Test accounts
    let owner: SignerWithAddress;
    let client: SignerWithAddress;
    let freelancer: SignerWithAddress;
    let feeCollector: SignerWithAddress;
    let other: SignerWithAddress;

    // Contracts
    let factory: EscrowFactory;
    let usdc: MockUSDC;
    let stableFX: MockStableFX;

    // Constants
    const INITIAL_BALANCE = ethers.parseUnits("100000", 6); // 100,000 USDC
    const CONTRACT_AMOUNT = ethers.parseUnits("3000", 6); // 3,000 USDC
    const PLATFORM_FEE = 200n; // 2%

    async function deployFixture() {
        [owner, client, freelancer, feeCollector, other] = await ethers.getSigners();

        // Deploy MockUSDC
        const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDCFactory.deploy();
        await usdc.waitForDeployment();

        // Deploy MockStableFX
        const MockStableFXFactory = await ethers.getContractFactory("MockStableFX");
        stableFX = await MockStableFXFactory.deploy();
        await stableFX.waitForDeployment();

        // Deploy EscrowFactory
        const EscrowFactoryFactory = await ethers.getContractFactory("EscrowFactory");
        factory = await EscrowFactoryFactory.deploy(
            await usdc.getAddress(),
            await stableFX.getAddress(),
            feeCollector.address,
            owner.address
        );
        await factory.waitForDeployment();

        // Mint USDC to client
        await usdc.mint(client.address, INITIAL_BALANCE);
        await usdc.mint(freelancer.address, INITIAL_BALANCE);

        return { factory, usdc, stableFX, owner, client, freelancer, feeCollector, other };
    }

    // ============ EscrowFactory Tests ============

    describe("EscrowFactory", function () {
        beforeEach(async function () {
            const fixture = await loadFixture(deployFixture);
            factory = fixture.factory;
            usdc = fixture.usdc;
            stableFX = fixture.stableFX;
        });

        describe("Deployment", function () {
            it("Should deploy with correct initial values", async function () {
                expect(await factory.owner()).to.equal(owner.address);
                expect(await factory.feeCollector()).to.equal(feeCollector.address);
                expect(await factory.platformFeePercentage()).to.equal(PLATFORM_FEE);
                expect(await factory.usdcToken()).to.equal(await usdc.getAddress());
                expect(await factory.contractCount()).to.equal(0);
            });

            it("Should reject zero address for USDC", async function () {
                const EscrowFactoryFactory = await ethers.getContractFactory("EscrowFactory");
                await expect(
                    EscrowFactoryFactory.deploy(
                        ethers.ZeroAddress,
                        await stableFX.getAddress(),
                        feeCollector.address,
                        owner.address
                    )
                ).to.be.revertedWith("Invalid USDC address");
            });
        });

        describe("Contract Creation", function () {
            it("Should create new escrow contract", async function () {
                const milestones = [
                    { amount: ethers.parseUnits("1470", 6), description: "Milestone 1" },
                    { amount: ethers.parseUnits("1470", 6), description: "Milestone 2" },
                ];

                // Calculate fee: 3000 * 2% = 60, net = 2940
                const totalAmount = CONTRACT_AMOUNT;
                const expectedFee = (totalAmount * PLATFORM_FEE) / 10000n;

                // Approve USDC for fee
                await usdc.connect(client).approve(await factory.getAddress(), expectedFee);

                // Create contract
                const tx = await factory.connect(client).createEscrowContract(
                    freelancer.address,
                    totalAmount,
                    await usdc.getAddress(), // Payout in USDC
                    milestones
                );

                const receipt = await tx.wait();

                // Check event emitted
                await expect(tx).to.emit(factory, "ContractCreated");

                // Verify contract count increased
                expect(await factory.contractCount()).to.equal(1);

                // Verify user contracts mapping
                const clientContracts = await factory.getUserContracts(client.address);
                expect(clientContracts.length).to.equal(1);

                const freelancerContracts = await factory.getUserContracts(freelancer.address);
                expect(freelancerContracts.length).to.equal(1);
            });

            it("Should charge platform fee on creation", async function () {
                const milestones = [
                    { amount: ethers.parseUnits("2940", 6), description: "Full project" },
                ];

                const totalAmount = CONTRACT_AMOUNT;
                const expectedFee = (totalAmount * PLATFORM_FEE) / 10000n;

                // Get initial balance
                const initialFeeCollectorBalance = await usdc.balanceOf(feeCollector.address);

                // Approve and create
                await usdc.connect(client).approve(await factory.getAddress(), expectedFee);
                await factory.connect(client).createEscrowContract(
                    freelancer.address,
                    totalAmount,
                    await usdc.getAddress(),
                    milestones
                );

                // Verify fee was collected
                const finalFeeCollectorBalance = await usdc.balanceOf(feeCollector.address);
                expect(finalFeeCollectorBalance - initialFeeCollectorBalance).to.equal(expectedFee);
            });

            it("Should prevent creation with invalid parameters", async function () {
                const validMilestones = [
                    { amount: ethers.parseUnits("2940", 6), description: "Milestone 1" },
                ];

                // Zero freelancer address
                await expect(
                    factory.connect(client).createEscrowContract(
                        ethers.ZeroAddress,
                        CONTRACT_AMOUNT,
                        await usdc.getAddress(),
                        validMilestones
                    )
                ).to.be.revertedWith("Invalid freelancer address");

                // Self as freelancer
                await expect(
                    factory.connect(client).createEscrowContract(
                        client.address,
                        CONTRACT_AMOUNT,
                        await usdc.getAddress(),
                        validMilestones
                    )
                ).to.be.revertedWith("Cannot create contract with self");

                // Zero amount
                await expect(
                    factory.connect(client).createEscrowContract(
                        freelancer.address,
                        0,
                        await usdc.getAddress(),
                        validMilestones
                    )
                ).to.be.revertedWith("Amount must be > 0");

                // Empty milestones
                await expect(
                    factory.connect(client).createEscrowContract(
                        freelancer.address,
                        CONTRACT_AMOUNT,
                        await usdc.getAddress(),
                        []
                    )
                ).to.be.revertedWith("Must have milestones");
            });

            it("Should track all user contracts", async function () {
                const fee = (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                const netAmount = CONTRACT_AMOUNT - fee;
                const milestones = [{ amount: netAmount, description: "Milestone" }];

                // Approve for 3 contracts
                await usdc.connect(client).approve(await factory.getAddress(), fee * 3n);

                // Create 3 contracts
                for (let i = 0; i < 3; i++) {
                    await factory.connect(client).createEscrowContract(
                        freelancer.address,
                        CONTRACT_AMOUNT,
                        await usdc.getAddress(),
                        milestones
                    );
                }

                const clientContracts = await factory.getUserContracts(client.address);
                expect(clientContracts.length).to.equal(3);
            });
        });

        describe("Admin Functions", function () {
            it("Should allow owner to update platform fee", async function () {
                const newFee = 150n; // 1.5%
                await factory.connect(owner).setPlatformFee(newFee);
                expect(await factory.platformFeePercentage()).to.equal(newFee);
            });

            it("Should prevent non-owner from updating fee", async function () {
                await expect(
                    factory.connect(client).setPlatformFee(100)
                ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
            });

            it("Should reject fee above 10%", async function () {
                await expect(
                    factory.connect(owner).setPlatformFee(1001)
                ).to.be.revertedWith("Fee too high (max 10%)");
            });

            it("Should allow owner to pause/unpause", async function () {
                await factory.connect(owner).pause();

                const fee = (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                const milestones = [{ amount: CONTRACT_AMOUNT - fee, description: "Test" }];
                await usdc.connect(client).approve(await factory.getAddress(), fee);

                await expect(
                    factory.connect(client).createEscrowContract(
                        freelancer.address,
                        CONTRACT_AMOUNT,
                        await usdc.getAddress(),
                        milestones
                    )
                ).to.be.revertedWithCustomError(factory, "EnforcedPause");

                await factory.connect(owner).unpause();

                // Should work after unpause
                await factory.connect(client).createEscrowContract(
                    freelancer.address,
                    CONTRACT_AMOUNT,
                    await usdc.getAddress(),
                    milestones
                );
            });
        });
    });

    // ============ EscrowContract Tests ============

    describe("EscrowContract", function () {
        let escrowContract: EscrowContract;
        let escrowAddress: string;
        const milestoneAmounts = [
            ethers.parseUnits("1000", 6),
            ethers.parseUnits("1500", 6),
            ethers.parseUnits("440", 6), // Adjusted for fee: 3000 - 60 fee = 2940 / distributes as 1000+1500+440
        ];

        async function createContractFixture() {
            const { factory, usdc, stableFX, client, freelancer, feeCollector } = await loadFixture(deployFixture);

            const milestones = [
                { amount: milestoneAmounts[0], description: "Design phase" },
                { amount: milestoneAmounts[1], description: "Development phase" },
                { amount: milestoneAmounts[2], description: "Testing phase" },
            ];

            const fee = (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
            await usdc.connect(client).approve(await factory.getAddress(), fee);

            const tx = await factory.connect(client).createEscrowContract(
                freelancer.address,
                CONTRACT_AMOUNT,
                await usdc.getAddress(),
                milestones
            );

            const receipt = await tx.wait();
            const event = receipt?.logs.find(
                (log: any) => log.fragment?.name === "ContractCreated"
            );
            escrowAddress = (event as any).args[0];

            const EscrowContractFactory = await ethers.getContractFactory("EscrowContract");
            escrowContract = EscrowContractFactory.attach(escrowAddress) as EscrowContract;

            return { escrowContract, factory, usdc, stableFX, client, freelancer, feeCollector };
        }

        describe("Funding", function () {
            beforeEach(async function () {
                const fixture = await loadFixture(createContractFixture);
                escrowContract = fixture.escrowContract;
                usdc = fixture.usdc;
            });

            it("Should allow client to fund contract", async function () {
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;

                await usdc.connect(client).approve(escrowAddress, netAmount);
                await expect(escrowContract.connect(client).fundContract())
                    .to.emit(escrowContract, "ContractFunded")
                    .withArgs(netAmount, await time.latest() + 1);

                expect(await escrowContract.funded()).to.be.true;
            });

            it("Should prevent non-client from funding", async function () {
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(freelancer).approve(escrowAddress, netAmount);

                await expect(
                    escrowContract.connect(freelancer).fundContract()
                ).to.be.revertedWith("Only client can call");
            });

            it("Should prevent double funding", async function () {
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(client).approve(escrowAddress, netAmount * 2n);

                await escrowContract.connect(client).fundContract();

                await expect(
                    escrowContract.connect(client).fundContract()
                ).to.be.revertedWith("Already funded");
            });
        });

        describe("Milestone Submission", function () {
            beforeEach(async function () {
                const fixture = await loadFixture(createContractFixture);
                escrowContract = fixture.escrowContract;
                usdc = fixture.usdc;

                // Fund the contract
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(client).approve(escrowAddress, netAmount);
                await escrowContract.connect(client).fundContract();
            });

            it("Should allow freelancer to submit milestone", async function () {
                const deliverableURI = "ipfs://QmTest123";

                await expect(escrowContract.connect(freelancer).submitMilestone(0, deliverableURI))
                    .to.emit(escrowContract, "MilestoneSubmitted");

                const milestone = await escrowContract.getMilestone(0);
                expect(milestone.submitted).to.be.true;
                expect(milestone.deliverableURI).to.equal(deliverableURI);
                expect(milestone.submittedAt).to.be.gt(0);
            });

            it("Should prevent client from submitting", async function () {
                await expect(
                    escrowContract.connect(client).submitMilestone(0, "ipfs://test")
                ).to.be.revertedWith("Only freelancer can call");
            });

            it("Should prevent double submission", async function () {
                await escrowContract.connect(freelancer).submitMilestone(0, "ipfs://first");

                await expect(
                    escrowContract.connect(freelancer).submitMilestone(0, "ipfs://second")
                ).to.be.revertedWith("Already submitted");
            });

            it("Should require deliverable URI", async function () {
                await expect(
                    escrowContract.connect(freelancer).submitMilestone(0, "")
                ).to.be.revertedWith("Deliverable URI required");
            });
        });

        describe("Milestone Approval", function () {
            beforeEach(async function () {
                const fixture = await loadFixture(createContractFixture);
                escrowContract = fixture.escrowContract;
                usdc = fixture.usdc;

                // Fund and submit first milestone
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(client).approve(escrowAddress, netAmount);
                await escrowContract.connect(client).fundContract();
                await escrowContract.connect(freelancer).submitMilestone(0, "ipfs://test");
            });

            it("Should allow client to approve submitted milestone", async function () {
                await expect(escrowContract.connect(client).approveMilestone(0))
                    .to.emit(escrowContract, "MilestoneApproved");

                const milestone = await escrowContract.getMilestone(0);
                expect(milestone.approved).to.be.true;
            });

            it("Should prevent approving unsubmitted milestone", async function () {
                await expect(
                    escrowContract.connect(client).approveMilestone(1)
                ).to.be.revertedWith("Not submitted yet");
            });

            it("Should auto-approve after 7 days", async function () {
                // Fast forward 7 days
                await time.increase(7 * 24 * 60 * 60);

                expect(await escrowContract.canAutoApprove(0)).to.be.true;

                await expect(escrowContract.connect(other).autoApproveMilestone(0))
                    .to.emit(escrowContract, "MilestoneAutoApproved");

                const milestone = await escrowContract.getMilestone(0);
                expect(milestone.approved).to.be.true;
            });

            it("Should not auto-approve before 7 days", async function () {
                // Fast forward only 6 days
                await time.increase(6 * 24 * 60 * 60);

                expect(await escrowContract.canAutoApprove(0)).to.be.false;

                await expect(
                    escrowContract.connect(other).autoApproveMilestone(0)
                ).to.be.revertedWith("Auto-approve period not passed");
            });
        });

        describe("Payment Release", function () {
            beforeEach(async function () {
                const fixture = await loadFixture(createContractFixture);
                escrowContract = fixture.escrowContract;
                usdc = fixture.usdc;

                // Fund, submit, and approve first milestone
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(client).approve(escrowAddress, netAmount);
                await escrowContract.connect(client).fundContract();
                await escrowContract.connect(freelancer).submitMilestone(0, "ipfs://test");
                await escrowContract.connect(client).approveMilestone(0);
            });

            it("Should release payment for approved milestone", async function () {
                const initialBalance = await usdc.balanceOf(freelancer.address);

                await expect(escrowContract.connect(other).releaseMilestonePayment(0))
                    .to.emit(escrowContract, "PaymentReleased");

                const finalBalance = await usdc.balanceOf(freelancer.address);
                expect(finalBalance - initialBalance).to.equal(milestoneAmounts[0]);

                const milestone = await escrowContract.getMilestone(0);
                expect(milestone.paid).to.be.true;
            });

            it("Should prevent releasing unapproved milestone", async function () {
                await escrowContract.connect(freelancer).submitMilestone(1, "ipfs://test2");

                await expect(
                    escrowContract.connect(other).releaseMilestonePayment(1)
                ).to.be.revertedWith("Not approved yet");
            });

            it("Should prevent double payment", async function () {
                await escrowContract.connect(other).releaseMilestonePayment(0);

                await expect(
                    escrowContract.connect(other).releaseMilestonePayment(0)
                ).to.be.revertedWith("Already paid");
            });

            it("Should mark contract complete when all paid", async function () {
                // Pay milestone 0
                await escrowContract.connect(other).releaseMilestonePayment(0);

                // Submit, approve, pay milestone 1
                await escrowContract.connect(freelancer).submitMilestone(1, "ipfs://test2");
                await escrowContract.connect(client).approveMilestone(1);
                await escrowContract.connect(other).releaseMilestonePayment(1);

                // Submit, approve, pay milestone 2
                await escrowContract.connect(freelancer).submitMilestone(2, "ipfs://test3");
                await escrowContract.connect(client).approveMilestone(2);
                await escrowContract.connect(other).releaseMilestonePayment(2);

                // Check status is COMPLETED (1)
                expect(await escrowContract.status()).to.equal(1);
            });
        });

        describe("Dispute", function () {
            beforeEach(async function () {
                const fixture = await loadFixture(createContractFixture);
                escrowContract = fixture.escrowContract;
                usdc = fixture.usdc;

                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(client).approve(escrowAddress, netAmount);
                await escrowContract.connect(client).fundContract();
            });

            it("Should allow client to initiate dispute", async function () {
                await expect(escrowContract.connect(client).initiateDispute())
                    .to.emit(escrowContract, "DisputeInitiated")
                    .withArgs(client.address, await time.latest() + 1);

                expect(await escrowContract.status()).to.equal(2); // DISPUTED
            });

            it("Should allow freelancer to initiate dispute", async function () {
                await expect(escrowContract.connect(freelancer).initiateDispute())
                    .to.emit(escrowContract, "DisputeInitiated");

                expect(await escrowContract.status()).to.equal(2); // DISPUTED
            });

            it("Should prevent operations during dispute", async function () {
                await escrowContract.connect(freelancer).submitMilestone(0, "ipfs://test");
                await escrowContract.connect(client).initiateDispute();

                await expect(
                    escrowContract.connect(client).approveMilestone(0)
                ).to.be.revertedWith("Contract not active");
            });
        });

        describe("Cancellation", function () {
            beforeEach(async function () {
                const fixture = await loadFixture(createContractFixture);
                escrowContract = fixture.escrowContract;
                usdc = fixture.usdc;
            });

            it("Should allow client to cancel if no submissions", async function () {
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(client).approve(escrowAddress, netAmount);
                await escrowContract.connect(client).fundContract();

                const initialBalance = await usdc.balanceOf(client.address);

                await expect(escrowContract.connect(client).cancelContract())
                    .to.emit(escrowContract, "ContractCancelled");

                const finalBalance = await usdc.balanceOf(client.address);
                expect(finalBalance - initialBalance).to.equal(netAmount);

                expect(await escrowContract.status()).to.equal(3); // CANCELLED
            });

            it("Should prevent cancellation after submission", async function () {
                const netAmount = CONTRACT_AMOUNT - (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
                await usdc.connect(client).approve(escrowAddress, netAmount);
                await escrowContract.connect(client).fundContract();
                await escrowContract.connect(freelancer).submitMilestone(0, "ipfs://test");

                await expect(
                    escrowContract.connect(client).cancelContract()
                ).to.be.revertedWith("Cannot cancel after submission");
            });

            it("Should allow cancellation before funding", async function () {
                await expect(escrowContract.connect(client).cancelContract())
                    .to.emit(escrowContract, "ContractCancelled")
                    .withArgs(0, await time.latest() + 1);

                expect(await escrowContract.status()).to.equal(3); // CANCELLED
            });
        });
    });

    // ============ Integration Tests ============

    describe("Full Workflow Integration", function () {
        it("Should complete full 3-milestone contract", async function () {
            const { factory, usdc, client, freelancer, feeCollector } = await loadFixture(deployFixture);

            const milestones = [
                { amount: ethers.parseUnits("1000", 6), description: "Phase 1" },
                { amount: ethers.parseUnits("1500", 6), description: "Phase 2" },
                { amount: ethers.parseUnits("440", 6), description: "Phase 3" },
            ];

            // Calculate amounts
            const fee = (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
            const netAmount = CONTRACT_AMOUNT - fee;

            // 1. Create contract
            await usdc.connect(client).approve(await factory.getAddress(), fee);
            const tx = await factory.connect(client).createEscrowContract(
                freelancer.address,
                CONTRACT_AMOUNT,
                await usdc.getAddress(),
                milestones
            );

            const receipt = await tx.wait();
            const event = receipt?.logs.find((log: any) => log.fragment?.name === "ContractCreated");
            const escrowAddress = (event as any).args[0];
            const EscrowContractFactory = await ethers.getContractFactory("EscrowContract");
            const escrowContract = EscrowContractFactory.attach(escrowAddress) as EscrowContract;

            // 2. Fund contract
            await usdc.connect(client).approve(escrowAddress, netAmount);
            await escrowContract.connect(client).fundContract();

            const freelancerInitialBalance = await usdc.balanceOf(freelancer.address);

            // 3. Complete all milestones
            for (let i = 0; i < 3; i++) {
                await escrowContract.connect(freelancer).submitMilestone(i, `ipfs://deliverable${i}`);
                await escrowContract.connect(client).approveMilestone(i);
                await escrowContract.releaseMilestonePayment(i);
            }

            // 4. Verify final state
            expect(await escrowContract.status()).to.equal(1); // COMPLETED
            expect(await escrowContract.totalPaid()).to.equal(netAmount);

            const freelancerFinalBalance = await usdc.balanceOf(freelancer.address);
            expect(freelancerFinalBalance - freelancerInitialBalance).to.equal(netAmount);
        });

        it("Should handle auto-approval workflow", async function () {
            const { factory, usdc, client, freelancer, other } = await loadFixture(deployFixture);

            const milestones = [
                { amount: ethers.parseUnits("2940", 6), description: "Full project" },
            ];

            const fee = (CONTRACT_AMOUNT * PLATFORM_FEE) / 10000n;
            const netAmount = CONTRACT_AMOUNT - fee;

            // Create and fund
            await usdc.connect(client).approve(await factory.getAddress(), fee);
            const tx = await factory.connect(client).createEscrowContract(
                freelancer.address,
                CONTRACT_AMOUNT,
                await usdc.getAddress(),
                milestones
            );

            const receipt = await tx.wait();
            const event = receipt?.logs.find((log: any) => log.fragment?.name === "ContractCreated");
            const escrowAddress = (event as any).args[0];
            const EscrowContractFactory = await ethers.getContractFactory("EscrowContract");
            const escrowContract = EscrowContractFactory.attach(escrowAddress) as EscrowContract;

            await usdc.connect(client).approve(escrowAddress, netAmount);
            await escrowContract.connect(client).fundContract();

            // Submit milestone
            await escrowContract.connect(freelancer).submitMilestone(0, "ipfs://work");

            // Wait 7 days
            await time.increase(7 * 24 * 60 * 60);

            // Anyone can trigger auto-approve
            await escrowContract.connect(other).autoApproveMilestone(0);

            // Release payment
            const initialBalance = await usdc.balanceOf(freelancer.address);
            await escrowContract.releaseMilestonePayment(0);
            const finalBalance = await usdc.balanceOf(freelancer.address);

            expect(finalBalance - initialBalance).to.equal(netAmount);
            expect(await escrowContract.status()).to.equal(1); // COMPLETED
        });
    });
});
