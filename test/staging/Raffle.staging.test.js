const { deployments, getNamedAccounts, network, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name) 
    ? describe.skip 
    : describe("Raffle Staging  Tests", function () {
        let raffle, signer, raffleEntranceFee;

        beforeEach(async function () { 
            const { deployer } = await getNamedAccounts();
            signer = await ethers.getSigner(deployer);            const _raffle = await deployments.get("Raffle")
            
            raffle = await ethers.getContractAt("Raffle", _raffle.address, signer);            raffleEntranceFee =  await raffle.getEntranceFee();
        });

        describe("fulfillRandomWords", function () {
            it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                
                console.log("Setting up test...");
                const startingTimeStamp = await raffle.getLastTimeStamp();
                const accounts = await ethers.getSigners();

                console.log("Setting up Listener...")
                await new Promise(async (resolve, reject) => {                    raffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!");
                        try {
                            
                            const recentWinner = await raffle.getRecentWinner();
                            const raffleState = await raffle.getRaffleState();
                            const winnerEndingBalance = await ethers.provider.getBalance(recentWinner)
                            const endingTimeStamp = await raffle.getLastTimeStamp();
                            const raffleBalance = await ethers.provider.getBalance(raffle.target);

                            await expect(raffle.getPlayer(0)).to.be.reverted;
                            assert.equal(recentWinner.toString(), accounts[0].address);
                            assert.equal(raffleState, 0);
                            assert.equal(raffleBalance, 0);
                            assert.equal(winnerEndingBalance, winnerStartingBalance + startingRaffleBalance);
                            assert(endingTimeStamp > startingTimeStamp);
                            resolve();
                        } catch (error) {
                            console.log(error);
                            reject(error);
                        }
                    })
                    
                    console.log("Entering Raffle...");
                    const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                    await tx.wait(1);
                    console.log("Ok, time to wait...");
                    const startingRaffleBalance = await ethers.provider.getBalance(raffle.target);
                    const winnerStartingBalance = await ethers.provider.getBalance(accounts[0].address);                });
            })
        })
    })