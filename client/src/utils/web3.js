import Web3 from "web3";
import LandRegistryContract from "../../../build/contracts/LandRegistry.json";

let web3;
let landRegistry;

const initWeb3 = async () => {
  // Kiểm tra nếu người dùng đang dùng MetaMask
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      // Yêu cầu quyền truy cập tài khoản
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } catch (error) {
      console.error("User denied account access");
      
    }
  }
  // Kiểm tra nếu Web3 đã được tiêm bởi các ví cũ
  else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
  }
  // Nếu không có provider nào, sử dụng provider cục bộ
  else {
    web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));
  }
  return web3;
};

const initContract = async () => {
  const networkId = await web3.eth.net.getId();
  const deployedNetwork = LandRegistryContract.networks[networkId];

  if (deployedNetwork) {
    landRegistry = new web3.eth.Contract(
      LandRegistryContract.abi,
      deployedNetwork.address
    );
    return landRegistry;
  } else {
    throw new Error(
      "LandRegistry contract not deployed on the current network"
    );
  }
};

const getAccounts = async () => {
  return await web3.eth.getAccounts();
};

export { initWeb3, initContract, getAccounts, web3 };
