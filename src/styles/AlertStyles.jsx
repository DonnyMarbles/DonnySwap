import styled, { keyframes } from 'styled-components';

export const ALERT_VARIANTS = {
  error: {
    title: 'Something went wrong',
    accent: '#f87171',
    icon: '⚠️',
    iconBg: 'rgba(248, 113, 113, 0.2)',
  },
  approval: {
    title: 'Approval confirmed',
    accent: '#4ade80',
    icon: '✔️',
    iconBg: 'rgba(74, 222, 128, 0.2)',
  },
  swap: {
    title: 'Swap successful',
    accent: '#38bdf8',
    icon: '⇄',
    iconBg: 'rgba(56, 189, 248, 0.2)',
  },
  liquidityAdd: {
    title: 'Liquidity added',
    accent: '#c084fc',
    icon: '➕',
    iconBg: 'rgba(192, 132, 252, 0.2)',
  },
  liquidityRemove: {
    title: 'Liquidity removed',
    accent: '#f97316',
    icon: '➖',
    iconBg: 'rgba(249, 115, 22, 0.2)',
  },
  success: {
    title: 'Success',
    accent: '#22c55e',
    icon: '✅',
    iconBg: 'rgba(34, 197, 94, 0.2)',
  },
  info: {
    title: 'Heads up',
    accent: '#facc15',
    icon: 'ℹ️',
    iconBg: 'rgba(250, 204, 21, 0.2)',
  },
};

export const getVariantTheme = (variant = 'info') => ALERT_VARIANTS[variant] || ALERT_VARIANTS.info;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translate3d(20px, -10px, 0) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
`;

export const AlertStackWrapper = styled.div`
  position: fixed;
  top: 5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(350px, calc(100vw - 2rem));
  z-index: 9999;
  pointer-events: none;

  @media (max-width: 640px) {
    left: 1rem;
    right: 1rem;
    width: auto;
  }
`;

export const AlertCard = styled.div`
  background: rgba(12, 12, 16, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 4px solid ${({ $variant }) => getVariantTheme($variant).accent};
  border-radius: 14px;
  padding: 0.95rem 1.1rem 0.85rem 1rem;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  color: #f8fafc;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  animation: ${slideIn} 0.35s cubic-bezier(0.22, 1, 0.36, 1);
`;

export const AlertHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

export const AlertIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${({ $variant }) => getVariantTheme($variant).iconBg};
  color: ${({ $variant }) => getVariantTheme($variant).accent};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
`;

export const AlertContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

export const AlertTitle = styled.div`
  font-weight: 600;
  font-size: 0.98rem;
  letter-spacing: 0.01em;
`;

export const AlertMessage = styled.p`
  margin: 0;
  color: #cbd5f5;
  font-size: 0.9rem;
  line-height: 1.4;
`;

export const AlertLinkRow = styled.div`
  font-size: 0.85rem;
  color: #cbd5f5;
`;

export const AlertLink = styled.a`
  color: ${({ $variant }) => getVariantTheme($variant).accent};
  font-weight: 600;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-thickness: 1px;
  margin-left: 0.25rem;

  &:hover {
    opacity: 0.85;
  }
`;

export const AlertControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #94a3b8;
  gap: 0.5rem;
`;

export const CountdownPill = styled.span`
  background: rgba(148, 163, 184, 0.15);
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.75rem;
`;

export const CloseButton = styled.button`
  border: none;
  background: rgba(248, 113, 113, 0.12);
  color: #fecaca;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: rgba(248, 113, 113, 0.25);
    transform: translateY(-1px);
  }
`;

export const AlertProgressTrack = styled.div`
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
`;

export const AlertProgressBar = styled.div`
  height: 100%;
  background: ${({ $variant }) => getVariantTheme($variant).accent};
  width: ${({ $percent }) => `${$percent}%`};
  transition: width 0.2s linear;
`;

export const AlertControlsWrapper = styled.div`
  position: fixed;
  top: 1.25rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  z-index: 10000;
  background: rgba(12, 12, 16, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  backdrop-filter: blur(8px);
`;

export const AlertToggleButton = styled.button`
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $disabled }) => ($disabled ? '#4b5563' : '#dbaa65')};
  color: ${({ $disabled }) => ($disabled ? '#d1d5db' : '#0f172a')};
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);

  &:hover {
    opacity: ${({ $disabled }) => ($disabled ? 0.8 : 0.95)};
  }
`;

export const AlertCheckboxLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #e2e8f0;
  cursor: pointer;
  user-select: none;
`;

export const AlertCheckboxInput = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #f87171;
  cursor: pointer;
`;

export const AlertHistoryDropdown = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  width: min(360px, calc(100vw - 2rem));
  max-height: 320px;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 0.75rem;
  box-shadow: 0 25px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  overflow: hidden;
  z-index: 10001;
`;

export const AlertHistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 0.35rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 999px;
  }
`;

export const AlertHistoryItem = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid ${({ $variant }) => getVariantTheme($variant).accent};
  border-radius: 10px;
  padding: 0.55rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.7);
`;

export const AlertHistoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
`;

export const AlertHistoryTitle = styled.span`
  font-weight: 600;
  color: #f1f5f9;
`;

export const AlertHistoryTimestamp = styled.time`
  font-size: 0.72rem;
  color: #94a3b8;
`;

export const AlertHistoryMessage = styled.p`
  margin: 0;
  font-size: 0.78rem;
  color: #cbd5f5;
  line-height: 1.35;
`;

export const AlertHistoryEmptyState = styled.div`
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
  padding: 1.5rem 0.5rem;
`;

