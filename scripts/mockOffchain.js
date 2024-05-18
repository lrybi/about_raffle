const { ethers, network, getNamedAccounts, deployments } = require("hardhat");

async function mockKeepers() {
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer);
    const _raffle = await deployments.get("Raffle");
    const raffle = await ethers.getContractAt("Raffle", _raffle.address, signer);
    const checkData = "0x";    const { upkeepNeeded } = await raffle.checkUpkeep(checkData);
    if (upkeepNeeded) {
        const tx = await raffle.performUpkeep(checkData);
        const txReceipt = await tx.wait(1);
        const requestId = txReceipt.logs[1].args.requestId;
        console.log(`Performed upkeep with RequestId: ${requestId}`);
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, raffle);
        }
    } else {
        console.log("No upkeep needed!");
    }
}

async function mockVrf(requestId, raffle) {
    console.log("We on a local network? Ok let's pretend...")
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer);
    const _VRFCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock")
    const vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", _VRFCoordinatorV2Mock.address, signer);
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.target);
    console.log("Responded!");
    const recentWinner = await raffle.getRecentWinner();
    console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })                