import { formatUnits, parseUnits, getAddress, maxUint256, zeroAddress } from 'viem';

export const ZERO = 0n;
export const MAX_UINT256 = maxUint256;
export const ZERO_ADDRESS = zeroAddress;

export const normalizeAddress = (value) => (value ? getAddress(value) : null);

export const toBigInt = (value) => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
  if (value === undefined || value === null) return ZERO;
  return BigInt(value);
};

export const formatAmount = (value = ZERO, decimals = 18) =>
  formatUnits(value ?? ZERO, decimals);

export const parseAmount = (value, decimals = 18) =>
  parseUnits(value?.toString() ?? '0', decimals);

export const executeContractWrite = async ({
  publicClient,
  walletClient,
  account,
  address,
  abi,
  functionName,
  args = [],
  value,
  gas,
  gasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  ...rest
}) => {
  if (!walletClient || !account) {
    throw new Error('Wallet not connected');
  }

  const txConfig = {
    account,
    address,
    abi,
    functionName,
    args,
    value,
    ...rest,
  };

  if (gas !== undefined) txConfig.gas = gas;
  if (gasPrice !== undefined) txConfig.gasPrice = gasPrice;
  if (maxFeePerGas !== undefined) txConfig.maxFeePerGas = maxFeePerGas;
  if (maxPriorityFeePerGas !== undefined) txConfig.maxPriorityFeePerGas = maxPriorityFeePerGas;

  const { request } = await publicClient.simulateContract(txConfig);

  let resolvedGas = gas;
  if (resolvedGas === undefined) {
    resolvedGas = await publicClient.estimateContractGas(txConfig);
  }

  const feeOverrides = {};
  const hasExplicitFees =
    gasPrice !== undefined || maxFeePerGas !== undefined || maxPriorityFeePerGas !== undefined;

  if (hasExplicitFees) {
    if (gasPrice !== undefined) feeOverrides.gasPrice = gasPrice;
    if (maxFeePerGas !== undefined) feeOverrides.maxFeePerGas = maxFeePerGas;
    if (maxPriorityFeePerGas !== undefined) {
      feeOverrides.maxPriorityFeePerGas = maxPriorityFeePerGas;
    }
  } else {
    feeOverrides.gasPrice = await publicClient.getGasPrice();
  }

  const hash = await walletClient.writeContract({
    ...request,
    gas: resolvedGas,
    ...feeOverrides,
    chain: request.chain ?? walletClient.chain,
  });

  return publicClient.waitForTransactionReceipt({ hash });
};

export const getFeeData = async (publicClient) => {
  const gasPrice = await publicClient.getGasPrice();
  return {
    gasPrice,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: gasPrice,
  };
};


