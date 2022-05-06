"use strict";
// const tokenAddress = "0xf9b0FA7feEe99A9c154fBd58A289011320DA7F15";
const oldtokenAddress = "0xf9b0FA7feEe99A9c154fBd58A289011320DA7F15";
const newtokenAddress = "0x66bA06535c35c5ba8B74C3477b47Ff0A0837a994";
const swapAddress = "0x42d1D4177ae77400B0EF2Fad53b2bb4AE6258BCc";

let format = 0;

const decimals = 18;

const minABI = [{
    constant: true,
    inputs: [{
        name: "_owner",
        type: "address"
    }],
    name: "balanceOf",
    outputs: [{
        name: "balance",
        type: "uint256"
    }],
    type: "function",
},
{
    "constant": false,
    "inputs": [
        {
            "name": "_amount",
            "type": "uint256"
        }
    ],
    "name": "deposit",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
},
{
    "inputs": [
        {
            "internalType": "address",
            "name": "spender",
            "type": "address"
        },
        {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
        }
    ],
    "name": "approve",
    "outputs": [
        {
            "internalType": "bool",
            "name": "",
            "type": "bool"
        }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
},
{
    "constant": false,
    "inputs": [
        {
            "name": "_amount",
            "type": "uint256"
        }
    ],
    "name": "withdraw",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
},
];

const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal
// Chosen wallet provider given by the dialog window
let provider;
/*Setup the orchestra*/
function init() {

    console.log("Initializing example");
    console.log("WalletConnectProvider is", WalletConnectProvider);
    console.log("window.web3 is", window.web3, "window.ethereum is", window.ethereum);
    // Tell Web3modal what providers we have available.
    // Built-in web browser provider (only one can exist as a time)
    // like MetaMask, Brave or Opera is added automatically by Web3modal
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                network: "binance",
                rpc: {
                    56: 'https://bsc-dataseed1.binance.org',
                }
            }
        }
    };

    web3Modal = new Web3Modal({
        network: "binance",
        cacheProvider: false, // optional
        providerOptions, // required
        disableInjectedProvider: false,
        theme: {
            background: "rgb(39, 49, 56)",
            main: "rgb(199, 199, 199)",
            secondary: "rgb(136, 136, 136)",
            border: "rgba(195, 195, 195, 0.14)",
            hover: "rgb(16, 26, 32)"
        } // optional. For MetaMask / Brave / Opera.
    });
    console.log("Web3Modal instance is", web3Modal);

    if (web3Modal.cachedProvider) {

        onConnect();
    }
}
/*Kick in the UI action after Web3modal dialog has chosen a provider*/
async function fetchAccountData() {

    // Get a Web3 instance for the wallet
    const web3 = new Web3(provider);

    console.log("Web3 instance is", web3);

    // Get connected chain id from Ethereum node

    const chainId = await web3.eth.getChainId();
    console.log("Connected chain id is", chainId);

    // Load chain information over an HTTP API
    //const chainData = evmChains.getChain(chainId);
    //document.querySelector("#network-name").textContent = chainData.name;

    // Get list of accounts of the connected wallet
    const accounts = await web3.eth.getAccounts();

    // MetaMask does not give you all accounts, only the selected account
    console.log("Got accounts", accounts);
    window.userWalletAddress = accounts[0];
    

    // Go through all accounts and get their ETH balance
    const rowResolvers = accounts.map(async (address) => {
        const balance = await web3.eth.getBalance(address);
        // ethBalance is a BigNumber instance

        const ethBalance = web3.utils.fromWei(balance, "ether");
        const humanFriendlyBalance = parseFloat(ethBalance).toFixed(4);
        console.log("humanFriendlyBalance: " + humanFriendlyBalance);

        writeAddress();
        getBalance();


    });
    // Because rendering account does its own RPC commucation
    // with Ethereum node, we do not want to display any results
    // until data for all accounts is loaded
    await Promise.all(rowResolvers);
    // Display fully loaded UI for wallet data
    document.querySelector("#prepare").style.display = "none";
    document.querySelector("#connected").style.display = "block";


    if (chainId == "56") {
        // MetaMask is locked or the user has not connected any accounts
        console.log('You are connected to the bnb blockchain');
    } else if (chainId !== "56") {

        switchEthereumChain();
    }
}
/**
 * Fetch account data for UI when
 * - User switches accounts in wallet
 * - User switches networks in wallet
 * - User connects wallet initially
 */
async function refreshAccountData() {
    // If any current data is displayed when
    // the user is switching acounts in the wallet
    // immediate hide this data
    document.querySelector("#connected").style.display = "none";
    document.querySelector("#prepare").style.display = "block";
    // Disable button while UI is loading.
    // fetchAccountData() will take a while as it communicates
    // with Ethereum node via JSON-RPC and loads chain data
    // over an API call.
    document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
    await fetchAccountData(provider);
    document.querySelector("#btn-connect").removeAttribute("disabled")
}
/*Connect wallet button pressed.*/
async function onConnect() {
    console.log("Opening a dialog", web3Modal);
    try {
        provider = await web3Modal.connect();
    } catch (e) {
        console.log("Could not get a wallet connection", e);
        return;
    }
    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts) => {
        fetchAccountData();
    });
    // Subscribe to chainId change
    provider.on("chainChanged", (chainId) => {
        fetchAccountData();
    });
    // Subscribe to networkId change
    provider.on("networkChanged", (networkId) => {
        fetchAccountData();
        switchEthereumChain();
    });
    await refreshAccountData();
}
/*Disconnect wallet button pressed.*/
async function onDisconnect() {
    console.log("Killing the wallet connection", provider);
    if (provider.close) {
        await provider.close();
        // If the cached provider is not cleared,
        // WalletConnect will default to the existing session
        // and does not allow to re-scan the QR code with a new wallet.
        // Depending on your use case you may want or want not his behavir.
        await web3Modal.clearCachedProvider();
        provider = null;
    }
    window.userWalletAddres = null;
    // Set the UI back to the initial state
    document.querySelector("#prepare").style.display = "block";
    document.querySelector("#connected").style.display = "none";
}
/* Main entry point.*/
window.addEventListener('load', async () => {
    init();
    document.querySelector("#btn-connect").addEventListener("click", onConnect);
    document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
    document.querySelector("#convert").addEventListener("click", approve);
});


function writeAddress() {
    document.querySelector("#btn-disconnect").textContent = window.userWalletAddress.substring(0, 6) + "..." + window.userWalletAddress.substring(38, 42)
}

async function switchEthereumChain() {
    try {
        const switchednetwork = await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{
                chainId: '0x38'
            }],
        });
    } catch (error) {
        if (error.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x38',
                        chainName: 'Binance Mainnet Network',
                        nativeCurrency: {
                            name: 'BINANCE',
                            symbol: 'BNB', // 2-6 characters long
                            decimals: 18
                        },
                        blockExplorerUrls: ['https://snowtrace.io/'],
                        rpcUrls: ['https://bsc-dataseed1.binance.org'],
                    }, ],
                });
            } catch (addError) {
                console.error(addError);
            }
        }
        // console.error(e)
    }
}


const numberFormat = new Intl.NumberFormat('en-US');

async function getBalance() {
    window.web3 = new Web3(provider);
    const contract = new window.web3.eth.Contract(minABI, oldtokenAddress);
    const result = await contract.methods.balanceOf(window.userWalletAddress).call();


    format = result / Math.pow(10, decimals);

    document.getElementById("balance").innerHTML = numberFormat.format(format.toFixed(5));
    document.getElementById("token").value = format;
    
}

async function approve() {
    window.web3 = new Web3(window.ethereum);
    const contract = new window.web3.eth.Contract(minABI, oldtokenAddress);
    const useraddress = web3.utils.toChecksumAddress(window.userWalletAddress);
    let tokens = document.getElementById("token").value;
    
    let totalPrice = web3.utils.toBN(tokens * Math.pow(10, decimals));

    contract.methods.approve(swapAddress, totalPrice)
        .send({from: useraddress}, function (err, res) {
            if (err) {
              console.log("An error occured", err)
              return
            } else {
                console.log("Approved", res);
                callDeposit();
            }
            console.log("Hash of the transaction: " + res)
          })
        ;

}

function callDeposit() {
    setTimeout(deposit, 3000);
}

async function deposit() {
    window.web3 = new Web3(window.ethereum);
    const contract = new window.web3.eth.Contract(minABI, swapAddress);
    const useraddress = web3.utils.toChecksumAddress(window.userWalletAddress);
    let tokens = document.getElementById("token").value;
    
    let totalPrice = web3.utils.toBN(tokens);

    contract.methods.deposit(totalPrice)
        .send({from: useraddress}, function (err, res) {
            if (err) {
              console.log("An error occured", err)
              return
            } 
            console.log("Hash of the transaction: " + res)
          })
        ;

}


async function addTokenFunction() {

    try {

        const wasAdded = await ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: newtokenAddress,
                    symbol: 'TBOSS',
                    decimals: decimals,
                    image: '',
                },
            },
        });

        if (wasAdded) {
            console.log('TBOSS token was added');
        } else {
            console.log('TBOSS token has not been added');
        }
    } catch (error) {
        console.log(error);
    }
}

addToken.addEventListener("click", function () {
    addTokenFunction();
});