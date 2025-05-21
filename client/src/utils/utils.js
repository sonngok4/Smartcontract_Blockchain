export const getEscrowStatus = state => {
	const statusMap = {
		'0': 'Đã tạo',
		'1': 'Đã xác nhận',
		'2': 'Đã hoàn thành',
		'3': 'Đã hủy',
		'4': 'Đã hoàn tiền',
		'5': 'Đang tranh chấp',
		'6': 'Đã giải quyết',
	};
	return statusMap[state] || 'Không xác định';
};

export const formatDate = timestamp => {
	return new Date(Number(timestamp) * 1000).toLocaleDateString('vi-VN');
};

export const formatWeiToEth = (web3, amount) => {
	return web3.utils.fromWei(amount.toString(), 'ether');
};

export const shortenAddress = address => {
	if (!address) return '';
	return `${address.substring(0, 6)}...${address.substring(
		address.length - 4,
	)}`;
};
