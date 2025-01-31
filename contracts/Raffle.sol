
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__SendMoreToEnterRaffle();
error Raffle__TransferFailed();
error Raffle__NotOpen();  
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A Sample Raffle Contract
 * @author Thinh Le
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink Keeper (Chainlink Automation)
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface { 
    enum RaffleState { 
        OPEN,
        CACULATING
    } 

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1; 


    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    address private s_recentWinner;
    RaffleState private s_raffleState; 
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    event RaffleEnter(address indexed player); 
    event RequestRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2, 
        uint256 entranceFee, 
        bytes32 gasLane, 
        uint64 subscriptionId, 
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN; 
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }
    
    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {revert Raffle__SendMoreToEnterRaffle();} 
        if (s_raffleState != RaffleState.OPEN) {revert Raffle__NotOpen();}
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call 
     * they look for the `upKeepNeeded` to return true
     * The following should be true in order to return true:
     * 1. Our time interval should have passed
     * 2. The lottery shound have at least 1 player, and have some ETH
     * 3. Our subscription is funded with LINK (LINK là token native của mạng lưới Chainlink. Token LINK được sử dụng để thanh toán các node trong mạng lưới Chainlink và là một phần quan trọng của hệ sinh thái này. Mục đích Chính của LINK được thiết kế để làm nhiệm vụ thanh toán trong mạng lưới Chainlink. Các node (hoặc nhà cung cấp Oracle) sẽ nhận LINK làm phần thưởng cho việc cung cấp dữ liệu ngoại vi vào các smart contract trên blockchain.)
     * 4. The lottery should be in an "open" state (s_raffleState = RaffleState.OPEN)
     */
    function checkUpkeep(
        bytes memory /*checkData*/ 
    )
        public 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory /* performData */) 
    {
        bool isOpen = (s_raffleState == RaffleState.OPEN);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x"); 
    }

    function performUpkeep(bytes calldata /* performData */) external override { 
        (bool upKeepNeeded, ) = checkUpkeep(""); 
        if (!upKeepNeeded) {
            revert Raffle__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_raffleState)); 
        }
        s_raffleState = RaffleState.CACULATING; 
        uint256 requestId = i_vrfCoordinator.requestRandomWords( 
            i_gasLane, 
            i_subscriptionId, 
            REQUEST_CONFIRMATIONS, 
            i_callbackGasLimit, 
            NUM_WORDS 
        );
        
        emit RequestRaffleWinner(requestId); 
    }

    
    function fulfillRandomWords(
        uint256 /*requestId*/, 
        uint256[] memory randomWords) 
        internal override { 
        uint256 indexOfWinner = randomWords[0] % s_players.length; 
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN; 
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;

        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) { revert  Raffle__TransferFailed();}

        emit WinnerPicked(recentWinner);

    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    } 
   
    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

        function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getVrfCoordinator() external view returns (address) {
        return address(i_vrfCoordinator);
    }

    function getGasLane() external view returns (bytes32) {
        return i_gasLane;
    }

    function getCallbackGasLimit() external view returns (uint32) {
        return i_callbackGasLimit;
    }
}

