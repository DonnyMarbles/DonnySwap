import {
  SHOULD_LOG_MEMORY_USAGE,
  MEMORY_LOG_INTERVAL_MS,
  BYTES_PER_MB,
} from '../config/constants.js';

const formatMb = (value) => (value / BYTES_PER_MB).toFixed(2);

const logMemoryUsage = () => {
  const { rss, heapUsed, heapTotal, external } = process.memoryUsage();
  console.log(
    `[memory] rss=${formatMb(rss)}MB heapUsed=${formatMb(heapUsed)}MB heapTotal=${formatMb(
      heapTotal
    )}MB external=${formatMb(external)}MB`
  );
};

const startMemoryUsageLogger = () => {
  if (!SHOULD_LOG_MEMORY_USAGE) {
    return;
  }
  const interval = setInterval(logMemoryUsage, MEMORY_LOG_INTERVAL_MS);
  if (typeof interval.unref === 'function') {
    interval.unref();
  }
};

export { startMemoryUsageLogger };

