// dev mode for switching correct network code
let correctNetwork;
let devMode = true;

devMode == true
    ? correctNetwork = 5//Goerli - opensea.io test
    // ? correctNetwork = 3//Ropsten - opensea.io test
    : correctNetwork = 1;

let isConnected = false;
let account;
let balance;
let mintIndexForSale = 0;
let maxSaleAmount = 0;
let mintPrice = 0;
let mintStartBlockNumber = 0;
let mintLimitPerBlock = 0;
let web3;

window.addEventListener('load', async () => {
    try{
        metamaskChecker();
        isConnected = true;
        let networkCode = await getChainId(isConnected);
        if(networkCode !== correctNetwork){
            alert('You are on the wrong network, please check again and refresh the window.');
            return;
        } else {
        connect();
        }
    }catch(error){
        alert('An error occured. Please try again or report to the moderator.');
        console.log(error);
    }

})

function metamaskChecker() {
    if (window.ethereum) {
        return true;
    } else {
        alert('Install and activate Metamask first!');
        return false;
    }
}

async function connect() {
    try{
        let networkCode = await getChainId(isConnected);
        if(networkCode !== correctNetwork){
            alert('You are on the wrong network, please check again and refresh the window.');
            return;
        } else{
            let loadAccounts = await ethereum.request({method: 'eth_requestAccounts'});
            account = loadAccounts[0];
            let loadBalance = await ethereum.request({method: 'eth_getBalance', params: [account, 'latest']});
            balance = convertWeiToEth(loadBalance);
            document.getElementById("myWallet").innerHTML = `Wallet Address: ${account}`;
            document.getElementById("myEth").innerHTML = `Balance: ${balance.toFixed(6)} Eth`;
            await checkStatus();
        }
    } catch(error) {
        alert('An error occured. Please try again or report to the moderator.');
        console.log(error.message);
    }
}

async function checkStatus() {
    try{
        web3 = new Web3(window.ethereum);
        const contract = await new web3.eth.Contract(
            ABI,
            CONTRACTADDRESS
        );
        let loadMintingInfo = await contract.methods.mintingInformation().call();

        mintIndexForSale = parseInt(loadMintingInfo[1]);
        mintLimitPerBlock = parseInt(loadMintingInfo[2]);
        mintStartBlockNumber = parseInt(loadMintingInfo[4]);
        maxSaleAmount = parseInt(loadMintingInfo[5]);
        mintPrice = parseInt(loadMintingInfo[6]);
        document.getElementById("mintCnt").innerHTML = `${mintIndexForSale - 1} / ${maxSaleAmount}`;
        document.getElementById("mintLimitPerBlock").innerHTML = `Max amount per transaction: ${mintLimitPerBlock}`;
        document.getElementById('amount').max = mintLimitPerBlock;
        document.getElementById("mintPrice").innerHTML = `Minting price: ${convertWeiToEth(mintPrice)} ETH`;
    } catch(error) {
        alert('An error occured. Please try again or report to the moderator.');
        console.log(error.message);
    }
}

async function whitelistMint() {
    try {
        let networkCode = await getChainId(isConnected);
        if (!account && !networkCode) {
            alert('Please connect to MetaMask.');
            return;
        }
        console.log(networkCode);
        if(networkCode !== correctNetwork){
            alert('You are on the wrong network, please check again and refresh the window.');
            return;
        }
        else {
            web3 = new Web3(window.ethereum);;
            const contract = await new web3.eth.Contract(
                ABI,
                CONTRACTADDRESS
            );
            let getWhitelist = await contract.methods.getWhitelistedUsersArray().call();
            let mintInfo = await contract.methods.mintingInformation().call();
            const leafNodes = getWhitelist.map(addr => keccak256(addr));
            const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
            const addr = keccak256(account);
            const hexProof = merkleTree.getHexProof(addr);
            const amount = document.getElementById('amount').value;
            await checkStatus();
            if (maxSaleAmount + 1 <= mintIndexForSale) {
                alert("All mint amount has been sold.");
                return;
            } else if(parseInt(mintInfo[2]) < amount){
                alert('You cannot mint more than the limited amount.');
                return;
            } else if(amount == 0 ){
                alert('You have to mint more than one.');
                return;
            } else{
                const totalValue = BigNumber(amount * mintPrice);
                const gasAmount = await contract.methods.whitelistMint(amount, hexProof).estimateGas({
                    from: account,
                    gas: 6000000,
                    value: totalValue
                });
                result = await contract.methods.whitelistMint(amount, hexProof).send({
                    from: account,
                    gas: gasAmount,
                    value: totalValue
                });
                console.log(result);
            }
        }
    } catch(error) {
        if(error.code == 4001) {
            alert('You cancelled the transaction.');
            return;
        }
        const firstJsonLetter = error.message.indexOf('{');
        const errorInJson = JSON.parse(error.message.substr(firstJsonLetter)).originalError;
        const errorReason = errorInJson.message;
        if(errorReason.includes(`execution reverted: Invalid proof!`)){
            alert('You are not on the whitelist.');
            return;
        } else if(errorReason.includes(`execution reverted: Address already claimed!`)){
            alert('You already claimed with this address.');
            return;
        } else if(errorReason.includes('execution reverted: The whitelist sale is not enabled!')) {
            alert('The whitelist sale is not open yet.');
            return;
        } else {
            console.log(error.code);
            alert('Minting failed. Please try again.');
            console.log(error);
            return;
        }
    }
}

