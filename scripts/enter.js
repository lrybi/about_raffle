const { ethers, getNamedAccounts, deployments } = require("hardhat")

async function main() {
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer);
    const _raffle = await deployments.get("Raffle")
    const raffle = await ethers.getContractAt("Raffle", _raffle.address, signer);
    console.log(`Got contract FundMe at ${raffle.target}`)
    console.log("Entering Raffle...");
    const entranceFee = await raffle.getEntranceFee();
    const tx = await raffle.enterRaffle({ value: entranceFee });
    await tx.wait(1);
    console.log("Entered!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })                                