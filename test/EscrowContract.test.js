const EscrowContract = artifacts.require('EscrowContract');
const LandRegistry = artifacts.require('LandRegistry');
const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');

contract('EscrowContract', accounts => {
	const [owner, feeCollector, user1, user2, user3] = accounts;
	let escrowContract;
	let landRegistry;
	const oneEther = web3.utils.toWei('1', 'ether');
	const twoEther = web3.utils.toWei('2', 'ether');

	beforeEach(async () => {
		// Deploy LandRegistry first
		landRegistry = await LandRegistry.new();

		// Deploy EscrowContract with LandRegistry address and fee collector
		escrowContract = await EscrowContract.new(
			landRegistry.address,
			feeCollector,
		);

		// Register a land for testing
		await landRegistry.registerLand(
			'Test Location',
			100,
			'test-doc-hash',
			'test-token-uri',
			{ from: user1 },
		);
	});

	describe('Contract Deployment', () => {
		it('should deploy with correct initial values', async () => {
			assert.equal(await escrowContract.owner(), owner);
			assert.equal(await escrowContract.feeCollector(), feeCollector);
			assert.equal(await escrowContract.platformFeePercent(), 100); // 1%
		});

		it('should update platform fee', async () => {
			await escrowContract.updatePlatformFee(200, { from: owner });
			assert.equal(await escrowContract.platformFeePercent(), 200);
		});

		it('should fail to update platform fee if not owner', async () => {
			await expectRevert(
				escrowContract.updatePlatformFee(200, { from: user1 }),
				'Ownable: caller is not the owner',
			);
		});
	});

	describe('Escrow Creation', () => {
		it('should create new escrow', async () => {
			const result = await escrowContract.createEscrow(
				1, // landId
				30, // duration in days
				'contact@test.com',
				'agreement-hash',
				{ from: user2, value: oneEther },
			);

			const escrow = await escrowContract.getEscrowDetails(1);
			assert.equal(escrow.landId, 1);
			assert.equal(escrow.buyer, user2);
			assert.equal(escrow.seller, user1);
			assert.equal(escrow.amount, oneEther);
			assert.equal(escrow.state, 0); // Created state
		});

		it('should fail to create escrow with invalid land ID', async () => {
			await expectRevert(
				escrowContract.createEscrow(
					999,
					30,
					'contact@test.com',
					'agreement-hash',
					{ from: user2, value: oneEther },
				),
				'Land does not exist',
			);
		});

		it('should fail to create escrow for own land', async () => {
			await expectRevert(
				escrowContract.createEscrow(
					1,
					30,
					'contact@test.com',
					'agreement-hash',
					{ from: user1, value: oneEther },
				),
				'Cannot create escrow for your own land',
			);
		});
	});

	describe('Escrow Confirmation and Completion', () => {
		beforeEach(async () => {
			await escrowContract.createEscrow(
				1,
				30,
				'contact@test.com',
				'agreement-hash',
				{ from: user2, value: oneEther },
			);
		});

		it('should confirm escrow by seller', async () => {
			await escrowContract.confirmEscrow(1, { from: user1 });
			const escrow = await escrowContract.getEscrowDetails(1);
			assert.equal(escrow.state, 1); // Confirmed state
		});

		it('should fail to confirm escrow by non-seller', async () => {
			await expectRevert(
				escrowContract.confirmEscrow(1, { from: user2 }),
				'Only seller can confirm',
			);
		});

		it('should complete escrow and transfer funds', async () => {
			await escrowContract.confirmEscrow(1, { from: user1 });

			const initialSellerBalance = new BN(await web3.eth.getBalance(user1));
			const initialFeeCollectorBalance = new BN(
				await web3.eth.getBalance(feeCollector),
			);

			await escrowContract.completeEscrow(1, { from: user2 });

			const escrow = await escrowContract.getEscrowDetails(1);
			assert.equal(escrow.state, 2); // Completed state

			// Verify fee distribution (1% platform fee)
			const fee = new BN(oneEther).mul(new BN(100)).div(new BN(10000));
			const sellerAmount = new BN(oneEther).sub(fee);

			const finalSellerBalance = new BN(await web3.eth.getBalance(user1));
			const finalFeeCollectorBalance = new BN(
				await web3.eth.getBalance(feeCollector),
			);

			assert(finalSellerBalance.sub(initialSellerBalance).eq(sellerAmount));
			assert(finalFeeCollectorBalance.sub(initialFeeCollectorBalance).eq(fee));
		});
	});

	describe('Escrow Cancellation and Refund', () => {
		beforeEach(async () => {
			await escrowContract.createEscrow(
				1,
				30,
				'contact@test.com',
				'agreement-hash',
				{ from: user2, value: oneEther },
			);
		});

		it('should allow buyer to cancel and refund escrow', async () => {
			// Lấy số dư ban đầu
			const initialBuyerBalance = new BN(await web3.eth.getBalance(user2));

			// Thực hiện hủy escrow
			const tx = await escrowContract.cancelEscrow(1, 'Changed mind', { from: user2 });

			const escrow = await escrowContract.getEscrowDetails(1);
			
			// Kiểm tra trạng thái cuối cùng là REFUNDED (4)
			assert.equal(escrow.state, 4, "Escrow should be in REFUNDED state");

			// Kiểm tra sự kiện
			const cancelEvent = tx.logs.find(log => log.event === 'EscrowCancelled');
			assert.exists(cancelEvent, "EscrowCancelled event should be emitted");
			assert.equal(cancelEvent.args.escrowId.toString(), '1');
			
			const refundEvent = tx.logs.find(log => log.event === 'EscrowRefunded');
			assert.exists(refundEvent, "EscrowRefunded event should be emitted");

			// Tính toán gas đã sử dụng
			const gasUsed = new BN(tx.receipt.gasUsed);
			const gasPrice = new BN(await web3.eth.getGasPrice());
			const gasCost = gasUsed.mul(gasPrice);

			// Lấy số dư cuối cùng
			const finalBuyerBalance = new BN(await web3.eth.getBalance(user2));

			// Tính toán số tiền thực tế nhận được (bao gồm cả gas fee)
			const expectedBalance = initialBuyerBalance
				.add(new BN(oneEther))     // Cộng số tiền hoàn lại
				.sub(gasCost);             // Trừ phí gas

			// So sánh với sai số nhỏ do gas estimation có thể không chính xác 100%
			const difference = finalBuyerBalance.sub(expectedBalance).abs();
			assert(difference.lt(new BN(web3.utils.toWei('0.01', 'ether'))), 
				"Balance difference should be minimal");
		});

		it('should not allow unauthorized cancellation', async () => {
			await expectRevert(
				escrowContract.cancelEscrow(1, 'Unauthorized', { from: user3 }),
				'Only buyer can cancel at this stage',
			);
		});
	});

	describe('Dispute Handling', () => {
		beforeEach(async () => {
			await escrowContract.createEscrow(
				1,
				30,
				'contact@test.com',
				'agreement-hash',
				{ from: user2, value: oneEther },
			);
			await escrowContract.confirmEscrow(1, { from: user1 });
		});

		it('should raise dispute', async () => {
			await escrowContract.raiseDispute(1, 'Payment issue', { from: user2 });
			const escrow = await escrowContract.getEscrowDetails(1);
			assert.equal(escrow.state, 5); // Disputed state
		});

		it('should resolve dispute with refund', async () => {
			await escrowContract.raiseDispute(1, 'Payment issue', { from: user2 });

			const initialBuyerBalance = new BN(await web3.eth.getBalance(user2));

			await escrowContract.resolveDispute(1, true, 'Refund approved', {
				from: owner,
			});
			const escrow = await escrowContract.getEscrowDetails(1);
			assert.equal(escrow.state, 4); // Refunded state

			const finalBuyerBalance = new BN(await web3.eth.getBalance(user2));
			assert(finalBuyerBalance.gt(initialBuyerBalance));
		});
	});

	describe('Partial Refund', () => {
		beforeEach(async () => {
			await escrowContract.createEscrow(
				1,
				30,
				'contact@test.com',
				'agreement-hash',
				{ from: user2, value: twoEther },
			);
			await escrowContract.confirmEscrow(1, { from: user1 });
		});

		it('should issue partial refund', async () => {
			const refundAmount = web3.utils.toWei('0.5', 'ether');
			const initialBuyerBalance = new BN(await web3.eth.getBalance(user2));

			await escrowContract.issuePartialRefund(
				1,
				refundAmount,
				'Partial refund',
				{ from: user1 },
			);

			const finalBuyerBalance = new BN(await web3.eth.getBalance(user2));
			assert(
				finalBuyerBalance.sub(initialBuyerBalance).eq(new BN(refundAmount)),
			);
		});
	});
});
