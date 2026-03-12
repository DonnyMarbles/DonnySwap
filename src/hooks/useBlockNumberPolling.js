import { useEffect, useState } from 'react';

const DEFAULT_POLL_INTERVAL_MS = 12_000;

const useBlockNumberPolling = (publicClient, intervalMs = DEFAULT_POLL_INTERVAL_MS) => {
  const [blockNumber, setBlockNumber] = useState(0);

  useEffect(() => {
    if (!publicClient) return undefined;

    let timer;
    const tick = async () => {
      try {
        const block = await publicClient.getBlockNumber();
        setBlockNumber(Number(block));
      } catch (error) {
        console.error('Failed to fetch block number', error);
      }
    };

    tick();
    timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [publicClient, intervalMs]);

  return blockNumber;
};

export default useBlockNumberPolling;
