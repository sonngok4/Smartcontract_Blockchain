import Web3 from 'web3';
import LandRegistryContract from '../../../build/contracts/LandRegistry.json';

let web3;

const initWeb3 = async () => {
	let web3Instance;

	// Development Mode Check
	const isDevelopment = import.meta.env.VITE_NODE_ENV === 'development';
	console.log(isDevelopment);
	

	if (isDevelopment) {
		// Connect to Ganache by default in development
		web3Instance = new Web3('http://127.0.0.1:7545');
	} else if (window.ethereum) {
		// MetaMask or other web3 provider
		web3Instance = new Web3(window.ethereum);
		try {
			// Request account access
			await window.ethereum.request({ method: 'eth_requestAccounts' });

			// Check if we're on Sepolia
			const chainId = await window.ethereum.request({ method: 'eth_chainId' });
			if (chainId !== '0xaa36a7') { // Sepolia chainId
				try {
					// Try to switch to Sepolia
					await window.ethereum.request({
						method: 'wallet_switchEthereumChain',
						params: [{ chainId: '0xaa36a7' }],
					});
				} catch (switchError) {
					// If Sepolia is not added to MetaMask, add it
					if (switchError.code === 4902) {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [{
								chainId: '0xaa36a7',
								chainName: 'Sepolia',
								nativeCurrency: {
									name: 'SepoliaETH',
									symbol: 'SEP',
									decimals: 18
								},
								rpcUrls: [
									`https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_PROJECT_ID}`,
									`https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`
								],
								blockExplorerUrls: ['https://sepolia.etherscan.io']
							}]
						});
					}
				}
			}
		} catch (error) {
			console.error('User denied account access');
			throw error;
		}
	} else {
		throw new Error('No Web3 provider detected');
	}

	// Assign the web3Instance to the global web3 variable
	web3 = web3Instance;
	return web3Instance;
};

const initContract = async () => {
	try {
		const networkId = await web3.eth.net.getId();
		const deployedNetwork = LandRegistryContract.networks[networkId];

		if (!deployedNetwork) {
			if (import.meta.env.VITE_NODE_ENV === 'development') {
				throw new Error(
					'Please make sure Ganache is running and the contract is deployed',
				);
			} else {
				throw new Error(
					`Contract not deployed on network ${networkId}. Please switch to the correct network.`,
				);
			}
		}

		return new web3.eth.Contract(
			LandRegistryContract.abi,
			deployedNetwork.address,
		);
	} catch (err) {
		console.error('Contract initialization error:', err);
		throw err;
	}
};

const getAccounts = async () => {
	return await web3.eth.getAccounts();
};

export { getAccounts, initContract, initWeb3, web3 };

