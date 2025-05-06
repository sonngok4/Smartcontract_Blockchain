// const LandRegistry = artifacts.require("LandRegistry");
// const { BN, expectRevert } = require('@openzeppelin/test-helpers');

// contract("LandRegistry", accounts => {
//     const [owner, user1, user2] = accounts;
//     let landRegistry;

//     beforeEach(async () => {
//         landRegistry = await LandRegistry.new();
//     });

//     describe("Land Registration", () => {
//         it("should register new land", async () => {
//             const result = await landRegistry.registerLand(
//                 "Location 1",
//                 100,
//                 "doc-hash-1",
//                 "token-uri-1",
//                 { from: user1 }
//             );

//             const land = await landRegistry.getLandDetails(1);
//             assert.equal(land.location, "Location 1");
//             assert.equal(land.area, 100);
//             assert.equal(land.owner, user1);
//         });
//     });

//     describe("Land Price Management", () => {
//         beforeEach(async () => {
//             await landRegistry.registerLand(
//                 "Location 1", 
//                 100,
//                 "doc-hash-1",
//                 "token-uri-1",
//                 { from: user1 }
//             );
//         });

//         it("should update land price", async () => {
//             await landRegistry.updateLandPrice(1, web3.utils.toWei("1", "ether"), { from: user1 });
//             const land = await landRegistry.getLandDetails(1);
//             assert.equal(land.price.toString(), web3.utils.toWei("1", "ether"));
//         });

//         it("should fail when non-owner tries to update price", async () => {
//             await expectRevert(
//                 landRegistry.updateLandPrice(1, web3.utils.toWei("1", "ether"), { from: user2 }),
//                 "You are not the owner of this land"
//             );
//         });
//     });

//     describe("Land Sale", () => {
//         beforeEach(async () => {
//             await landRegistry.registerLand(
//                 "Location 1",
//                 100, 
//                 "doc-hash-1",
//                 "token-uri-1",
//                 { from: user1 }
//             );
//             await landRegistry.updateLandPrice(1, web3.utils.toWei("1", "ether"), { from: user1 });
//         });

//         it("should set land for sale", async () => {
//             await landRegistry.setForSale(1, true, { from: user1 });
//             const land = await landRegistry.getLandDetails(1);
//             assert.equal(land.forSale, true);
//         });

//         it("should buy land", async () => {
//             await landRegistry.setForSale(1, true, { from: user1 });
//             await landRegistry.buyLand(1, { 
//                 from: user2,
//                 value: web3.utils.toWei("1", "ether")
//             });

//             const newOwner = await landRegistry.ownerOf(1);
//             assert.equal(newOwner, user2);
//         });
//     });

//     describe("Land Query", () => {
//         beforeEach(async () => {
//             await landRegistry.registerLand(
//                 "Location 1",
//                 100,
//                 "doc-hash-1", 
//                 "token-uri-1",
//                 { from: user1 }
//             );
//         });

//         it("should get transaction history", async () => {
//             const history = await landRegistry.getTransactionHistory(1);
//             assert.equal(history.length, 1);
//             assert.equal(history[0].from, "0x0000000000000000000000000000000000000000");
//             assert.equal(history[0].to, user1);
//         });

//         it("should get lands by owner", async () => {
//             const lands = await landRegistry.getLandsByOwner(user1);
//             assert.equal(lands.length, 1);
//             assert.equal(lands[0], 1);
//         });
//     });
// });