import styled from 'styled-components';

export const TokenSelectWrapper = styled.div`
  position: relative;
  width: 100%;
`;

export const TokenSelectButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #000;
  background: #dbaa65;
  color: #000;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover,
  &:focus-visible {
    background: #e7b166;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const TokenLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
`;

export const TokenIcon = styled.img`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: contain;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #fff;
`;

export const TokenIconFallback = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const PlaceholderText = styled.span`
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
`;

export const Caret = styled.span`
  margin-left: auto;
  font-size: 0.8rem;
`;

export const TokenOptionsList = styled.ul`
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 6px 0;
  border-radius: 8px;
  border: 1px solid #000;
  background: #fbe4bf;
  box-shadow: 0 8px 14px rgba(0, 0, 0, 0.18);
`;

export const TokenOption = styled.li`
  width: 100%;
`;

export const TokenOptionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #000;
  font-weight: ${(props) => (props.$isSelected ? 600 : 500)};

  &:hover,
  &:focus-visible {
    background: #f0c27c;
  }
`;

export const TokenMeta = styled.div`
  display: flex;
  align-items: flex-start;
  text-align: left;
  flex-direction: column;
  line-height: 1.2;
`;

export const TokenSymbol = styled.span`
  font-weight: 600;
  font-size: 0.95rem;
`;

export const TokenName = styled.span`
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.65);
`;

