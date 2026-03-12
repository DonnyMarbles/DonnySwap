const DEFAULT_EXPLORER_BASE_URL = 'https://peaq.subscan.io';

const trimTrailingSlash = (value) => value?.replace(/\/+$/, '');

export const buildExplorerTxUrl = (txHash, overrideBaseUrl) => {
  if (!txHash) return null;
  const baseUrl = trimTrailingSlash(overrideBaseUrl) || DEFAULT_EXPLORER_BASE_URL;
  return `${baseUrl}/tx/${txHash}`;
};

export default buildExplorerTxUrl;

