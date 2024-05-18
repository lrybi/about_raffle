require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https:/eth-sepolia";const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key";const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key";module.exports = {
  
  solidity: "0.8.7",
  defaultNetwork: "hardhat", 
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,    },
    sepolia: { 
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111, 
      blockConfirmations: 6,    },
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
    }
  },

  gasReporter: {
    enabled: false,
    
    outputFile: "gas-report.txt", 
    noColors: true, 
    currency: "USD", 
    coinmarketcap: COINMARKETCAP_API_KEY, 
      
    token: "ETH",   },

  namedAccounts: {
    
    deployer: {
      default: 0,
      
    },    player: {
      default: 1,
    }  },
  
  mocha: {    timeout: 500000,   }
};