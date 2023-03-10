// utility

function convertWeiToEth(wei) {
    return wei / (10 ** 18);
}

async function getChainId(ethActivated) {
    if (ethActivated == true) {
        let getHexChainId = await ethereum.request({method: 'eth_chainId'});
        return parseInt(getHexChainId, 16);
    }
}
