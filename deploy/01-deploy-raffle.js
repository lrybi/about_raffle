const { network, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");

const { verify } = require("../utils/verify");

require("dotenv").config();const VRF_SUB_FUND_AMOUNT = "1000000000000000000000";

module.exports = async ({ getNamedAccounts, deployments }) => {    const { deploy, log } = deployments;
        
    const { deployer } = await getNamedAccounts();     const signer = await ethers.getSigner(deployer);    const chainId = network.config.chainId;    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;
    if (developmentChains.includes(network.name)) {        const _vrfCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock");        vrfCoordinatorV2Address = _vrfCoordinatorV2Mock.address;
        vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfCoordinatorV2Address, signer);        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();        const transactionReceipt = await transactionResponse.wait(1);        subscriptionId = transactionReceipt.logs[0].args.subId;        vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);     } else { 
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"]
            
    }

    const entranceFee = networkConfig[chainId]["entranceFee"];
    
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const interval = networkConfig[chainId]["interval"];

    const args = [vrfCoordinatorV2Address, entranceFee, gasLane, subscriptionId, callbackGasLimit, interval];
    const raffle = await deploy("Raffle", {
        contract: "Raffle",
        from: deployer,
        args: args, 
        log: true, 
        waitConfirmaions: network.config.blockConfirmations || 1,    }); 
    log('Raffle Deployed!');    if (developmentChains.includes(network.name)) {        await (vrfCoordinatorV2Mock).addConsumer(subscriptionId, raffle.address);
    
        log('Consumer is added');
      }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) { 
        log("Verifying...");
        await verify(await raffle.address, args); 
    }
    log("------------------------------------------");
}
 
module.exports.tags = ["all", "raffle"];