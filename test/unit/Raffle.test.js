const { deployments, getNamedAccounts, network, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
!developmentChains.includes(network.name) 
    ? describe.skip 
    : describe("Raffle Unit Tests", function () {
        let raffle, vrfCoordinatorV2Mock, signer, raffleEntranceFee, interval;
        const chainId = network.config.chainId;

        beforeEach(async function () { 
            const { deployer } = await getNamedAccounts();
            signer = await ethers.getSigner(deployer);             const contracts = await deployments.fixture(["all"]);            raffle = await ethers.getContractAt("Raffle", contracts["Raffle"].address, signer);            vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock",contracts["VRFCoordinatorV2Mock"].address, signer);
            raffleEntranceFee = networkConfig[chainId]["entranceFee"];
            
            interval = networkConfig[chainId].interval;
            
        });

        describe("constructor", function () {
            it("initializes the raffle correctly", async function () {                const raffleState = await raffle.getRaffleState();
                const interval = await raffle.getInterval();

                const actualFees = await raffle.getEntranceFee();
                const actualVrfCoordinator = await raffle.getVrfCoordinator();
                const actualGasLane = await raffle.getGasLane();
                const actualCallbackGasLimit = await raffle.getCallbackGasLimit();
                
                assert.equal(raffleState.toString(), "0"); 
                assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
                
                assert.equal(actualFees.toString(), networkConfig[chainId]["entranceFee"]);
                assert.equal(actualVrfCoordinator.toString(), vrfCoordinatorV2Mock.target);                assert.equal(actualGasLane.toString(), networkConfig[chainId]["gasLane"]);
                assert.equal(actualCallbackGasLimit.toString(), networkConfig[chainId]["callbackGasLimit"]);
            });
        });

        describe("enterRaffle", function () {
            it("reverts when you don't pay enough", async () => {
                await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(raffle, "Raffle__SendMoreToEnterRaffle");
                    
            });
            it("records player when they enter", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                const playerFromContract = await raffle.getPlayer(0);
                assert.equal(playerFromContract, signer.address);
            });
            it("emits event on enter", async () => { 
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter").withArgs(signer.address);
                    
            });
            it("doesn't allow entrance when raffle is caculating", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [Number(interval) + 1]);                 await network.provider.send("evm_mine", []);                 await raffle.performUpkeep("0x"); 
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
            });
            
        });

        describe("checkUpkeep", function () {
            it("returns false if no one has entered the lottery", async function () {
                await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                await network.provider.send("evm_mine", []);

                const { upkeepNeeded } = await raffle.checkUpkeep("0x");                assert.equal(upkeepNeeded, false);
                
            })
            it("returns false if raffle isn't open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                await network.provider.request({ method: "evm_mine", params: [] });
                    
                await raffle.performUpkeep("0x"); 
                const raffleState = await raffle.getRaffleState(); 
                const { upkeepNeeded } = await raffle.checkUpkeep("0x");
                assert.equal(raffleState.toString() == "1", upkeepNeeded == false)            })
            it("returns false if enough time hasn't passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [Number(interval) - 5]); 
                await network.provider.request({ method: "evm_mine", params: [] });
                const { upkeepNeeded } = await raffle.checkUpkeep("0x"); 
                assert(!upkeepNeeded);
            });
            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                await network.provider.request({ method: "evm_mine", params: [] });
                const { upkeepNeeded } = await raffle.checkUpkeep("0x"); 
                assert(upkeepNeeded == true);
            });
        });

        describe("performUpkeep", () => {
            it("it can only run if upkeepNeeded is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
                await network.provider.send("evm_mine", []);

                const tx = await raffle.performUpkeep("0x");
                assert(tx);            });
            it("reverts if upkeepNeeded is false", async () => {
                await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                    raffle,
                    "Raffle__UpkeepNotNeeded"
                );            });
            it("updates the raffle state and emits a requestId", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval + 1]);
                await network.provider.send("evm_mine", []);
                const txResponse = await raffle.performUpkeep("0x");
                const txReceipt = await txResponse.wait(1);
                const raffleState = await raffle.getRaffleState()
                console.log(`       (tìm được requestId: ${txReceipt.logs[1].args.requestId})`);
                const requestId = txReceipt.logs[1].args.requestId;                assert(Number(requestId) > 0);                assert(raffleState.toString() == "1"); 
            });
        });

        describe("fulfillRandomWords", function () {

            beforeEach(async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
            })

            it("can only be called after performUpkeep", async () => {                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.target) 
                ).to.be.revertedWith("nonexistent request");                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.target) 
                ).to.be.revertedWith("nonexistent request");            });
            it("picks a winner, resets, and sends money", async () => {
                const additionalEntrants = 3;
                const startingAccountIndex = 1; 
                const accounts = await ethers.getSigners();
                const startingPlayerBalance =  {}; 
                for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
                    const accountConnectedRaffle = raffle.connect(accounts[i]);                    const enterResponse = await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                    await enterResponse.wait(1);
                    startingPlayerBalance[accounts[i].address] = await ethers.provider.getBalance(accounts[i].address)
                }
                const startingTimeStamp = await raffle.getLastTimeStamp();
                const startingRaffleBalance = await ethers.provider.getBalance(raffle.target);                await new Promise(async (resolve, reject) => {                    raffle.once("WinnerPicked", async () => {                         console.log("       (WinnerPicked event fired!)");
                        try {
                            const recentWinner = await raffle.getRecentWinner();
                            console.log(`       (winner is: ${recentWinner})`);
                            const raffleState = await raffle.getRaffleState();
                            const raffleBalance = await ethers.provider.getBalance(raffle.target);
                            const winnerEndingBalance = await ethers.provider.getBalance(recentWinner);
                            const endingTimeStamp = await raffle.getLastTimeStamp();

                            await expect(raffle.getPlayer(0)).to.be.reverted;
                            assert.equal(raffleState, 0);
                            assert.equal(raffleBalance, 0);
                            assert.equal(winnerEndingBalance, startingPlayerBalance[recentWinner] + startingRaffleBalance);
                            assert(endingTimeStamp > startingTimeStamp);

                            resolve(); 
                            
                        } catch (error) {
                            reject(); 
                    }
                })
                    const txResponse = await raffle.performUpkeep("0x");
                    const txReceipt = await txResponse.wait(1);
                    const requestId = txReceipt.logs[1].args.requestId;
                    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.target)                });            });
        });
    });