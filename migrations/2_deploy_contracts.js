const LandRegistry = artifacts.require('LandRegistry');
const EscrowContract = artifacts.require('EscrowContract');

module.exports = function(deployer) {
	deployer.deploy(LandRegistry).then(function() {
		return deployer.deploy(
			EscrowContract,
			LandRegistry.address,
			deployer.networks[deployer.network].from,
		);
	});
};
