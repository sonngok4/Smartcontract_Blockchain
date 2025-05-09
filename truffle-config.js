/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation, and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * https://trufflesuite.com/docs/truffle/reference/configuration
 *
 * Hands-off deployment with Infura
 * --------------------------------
 *
 * Do you have a complex application that requires lots of transactions to deploy?
 * Use this approach to make deployment a breeze 🏖️:
 *
 * Infura deployment needs a wallet provider (like @truffle/hdwallet-provider)
 * to sign transactions before they're sent to a remote public node.
 * Infura accounts are available for free at 🔍: https://infura.io/register
 *
 * You'll need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. You can store your secrets 🤐 in a .env file.
 * In your project root, run `$ npm install dotenv`.
 * Create .env (which should be .gitignored) and declare your MNEMONIC
 * and Infura PROJECT_ID variables inside.
 * For example, your .env file will have the following structure:
 *
 * MNEMONIC = <Your 12 phrase mnemonic>
 * PROJECT_ID = <Your Infura project id>
 *
 * Deployment with Truffle Dashboard (Recommended for best security practice)
 * --------------------------------------------------------------------------
 *
 * Are you concerned about security and minimizing rekt status 🤔?
 * Use this method for best security:
 *
 * Truffle Dashboard lets you review transactions in detail, and leverages
 * MetaMask for signing, so there's no need to copy-paste your mnemonic.
 * More details can be found at 🔎:
 *
 * https://trufflesuite.com/docs/truffle/getting-started/using-the-truffle-dashboard/
 */

require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { MNEMONIC, INFURA_PROJECT_ID } = process.env;

module.exports = {
	/**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a managed Ganache instance for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

	networks: {
		// Development network (Ganache)
		development: {
			host: '127.0.0.1',
			port: 7545,
			network_id: '*',
			gas: 6721975,
			gasPrice: 20000000000,
		},
		sepolia: {
			provider: () => {
				if (!MNEMONIC || !INFURA_PROJECT_ID) {
					throw new Error(
						'Please set MNEMONIC and INFURA_PROJECT_ID in your .env file',
					);
				}
				return new HDWalletProvider({
					mnemonic: MNEMONIC,
					providerOrUrl: `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
					addressIndex: 0,
					numberOfAddresses: 1,
					shareNonce: true,
					derivationPath: "m/44'/60'/0'/0/",
				});
			},
			network_id: 11155111,
			gas: 5500000,
			gasPrice: 20000000000,
			confirmations: 2,
			timeoutBlocks: 200,
			skipDryRun: true,
			websocket: true,
		},
		//
		// An additional network, but with some advanced options…
		// advanced: {
		//   port: 8777,             // Custom port
		//   network_id: 1342,       // Custom network
		//   gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
		//   gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
		//   from: <address>,        // Account to send transactions from (default: accounts[0])
		//   websocket: true         // Enable EventEmitter interface for web3 (default: false)
		// },
		//
		// Useful for deploying to a public network.
		// Note: It's important to wrap the provider as a function to ensure truffle uses a new provider every time.
		// sepolia: {
		//   provider: () =>
		//     new HDWalletProvider(
		//       MNEMONIC,
		//       `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
		//     ),
		//   network_id: 11155111, // Sepolia's network id
		//   confirmations: 2, // # of confirmations to wait between deployments
		//   timeoutBlocks: 200, // # of blocks before a deployment times out
		//   skipDryRun: true, // Skip dry run before migrations
		//   gas: 5500000, // Gas limit used for deploys
		//   gasPrice: 20000000000, // 20 gwei (in wei)
		// },
		//
		// Useful for private networks
		// private: {
		//   provider: () => new HDWalletProvider(MNEMONIC, `https://network.io`),
		//   network_id: 2111,   // This network is yours, in the cloud.
		//   production: true    // Treats this network as if it was a public net. (default: false)
		// }
	},

	// Set default mocha options here, use special reporters, etc.
	mocha: {
		// timeout: 100000
	},

	// Configure your compilers
	compilers: {
		solc: {
			version: '0.8.21', // Fetch exact version from solc-bin (default: truffle's version)
			// docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
			settings: {
				// See the solidity docs for advice about optimization and evmVersion
				optimizer: {
					enabled: true,
					runs: 200,
				},
				evmVersion: 'byzantium',
			},
		},
	},

	// Truffle DB is currently disabled by default; to enable it, change enabled:
	// false to enabled: true. The default storage location can also be
	// overridden by specifying the adapter settings, as shown in the commented code below.
	//
	// NOTE: It is not possible to migrate your contracts to truffle DB and you should
	// make a backup of your artifacts to a safe location before enabling this feature.
	//
	// After you backed up your artifacts you can utilize db by running migrate as follows:
	// $ truffle migrate --reset --compile-all
	//
	// db: {
	//   enabled: false,
	//   host: "127.0.0.1",
	//   adapter: {
	//     name: "indexeddb",
	//     settings: {
	//       directory: ".db"
	//     }
	//   }
	// }
};
