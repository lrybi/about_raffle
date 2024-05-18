const { deployments, network, ethers} = require("hardhat");
const fs = require("fs");
    
require("dotenv").config();

const FRONT_END_ADDRESSES_FILE = "../nextjs_smartcontract_lottery/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../nextjs_smartcontract_lottery/constants/abi.json";module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) { 
        console.log("Updating to front end...");        await updateContractAddresses1();
        await updateAbi1();        console.log("Front end Updated!")
        console.log("------------------------------------")
    }
}
async function updateAbi1() {
    const raffle = await deployments.get("Raffle");
    fs.writeFileSync(FRONT_END_ABI_FILE, JSON.stringify(raffle.abi))}

async function updateContractAddresses1() {
    const raffle = await deployments.get("Raffle");
        
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8"));    if (network.config.chainId.toString() in currentAddresses) {        if (!currentAddresses[network.config.chainId.toString()].includes(raffle.address)) {            currentAddresses[network.config.chainId.toString()] = [raffle.address];
            
        }
    } else {
        currentAddresses[network.config.chainId.toString()] = [raffle.address];
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));}async function updateAbi2() {
    const _raffle = await deployments.get("Raffle");
    const raffleAddress = _raffle.address;
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);    fs.writeFileSync(FRONT_END_ABI_FILE, JSON.stringify(raffle.interface.fragments));}

async function updateContractAddresses2() {
    const _raffle = await deployments.get("Raffle");
        
    const raffleAddress = _raffle.address;
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8"));    if (network.config.chainId.toString() in currentAddresses) {        if (!currentAddresses[network.config.chainId.toString()].includes(raffle.target)) {            currentAddresses[network.config.chainId.toString()] = [raffle.target];
            
        }
    } else {
        currentAddresses[network.config.chainId.toString()] = [raffle.target];
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));}module.exports.tags = ["all"]
