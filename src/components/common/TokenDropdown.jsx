import { useEffect, useMemo, useRef, useState } from 'react';
import {
  TokenSelectWrapper,
  TokenSelectButton,
  TokenLabel,
  TokenIcon,
  TokenIconFallback,
  PlaceholderText,
  Caret,
  TokenOptionsList,
  TokenOption,
  TokenOptionButton,
  TokenMeta,
  TokenSymbol,
  TokenName,
} from '../../styles/TokenSelectStyles';

const DEFAULT_PLACEHOLDER = 'Select token';

const TokenDropdown = ({
  value = 'default',
  onChange,
  options = [],
  tokens = {},
  placeholder = DEFAULT_PLACEHOLDER,
  id,
  includeDefaultOption = true,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedToken = value && value !== 'default' ? tokens[value] : null;

  const orderedOptions = useMemo(() => {
    const unique = Array.from(new Set(options.filter(Boolean)));
    if (!includeDefaultOption) return unique;
    return ['default', ...unique];
  }, [options, includeDefaultOption]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (tokenKey) => {
    setIsOpen(false);
    if (typeof onChange === 'function') {
      onChange(tokenKey);
    }
  };

  const renderTokenIcon = (token, tokenKey) => {
    if (token?.logo) {
      return <TokenIcon src={token.logo} alt={`${token.symbol} logo`} />;
    }
    const fallbackLetter = token?.symbol?.[0] ?? tokenKey?.[0] ?? '?';
    return <TokenIconFallback>{fallbackLetter}</TokenIconFallback>;
  };

  const renderLabel = () =>
    selectedToken ? (
      <>
        {renderTokenIcon(selectedToken, value)}
        <TokenMeta>
          <TokenSymbol>{selectedToken.symbol}</TokenSymbol>
          {selectedToken.name && <TokenName>{selectedToken.name}</TokenName>}
        </TokenMeta>
      </>
    ) : (
      <PlaceholderText>{placeholder}</PlaceholderText>
    );

  return (
    <TokenSelectWrapper id={id} ref={wrapperRef}>
      <TokenSelectButton
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <TokenLabel>{renderLabel()}</TokenLabel>
        <Caret>{isOpen ? '▲' : '▼'}</Caret>
      </TokenSelectButton>
      {isOpen && (
        <TokenOptionsList role="listbox">
          {orderedOptions.map((tokenKey) => {
            if (tokenKey === 'default') {
              return (
                <TokenOption key="default">
                  <TokenOptionButton
                    type="button"
                    onClick={() => handleSelect('default')}
                    aria-selected={value === 'default'}
                    $isSelected={value === 'default'}
                  >
                    <TokenMeta>
                      <TokenSymbol>No token selected</TokenSymbol>
                      <TokenName>Click to clear selection</TokenName>
                    </TokenMeta>
                  </TokenOptionButton>
                </TokenOption>
              );
            }

            const token = tokens[tokenKey];
            if (!token) return null;

            return (
              <TokenOption key={tokenKey}>
                <TokenOptionButton
                  type="button"
                  onClick={() => handleSelect(tokenKey)}
                  aria-selected={value === tokenKey}
                  $isSelected={value === tokenKey}
                >
                  <TokenLabel>
                    {renderTokenIcon(token, tokenKey)}
                    <TokenMeta>
                      <TokenSymbol>{token.symbol}</TokenSymbol>
                      {token.name && <TokenName>{token.name}</TokenName>}
                    </TokenMeta>
                  </TokenLabel>
                </TokenOptionButton>
              </TokenOption>
            );
          })}
        </TokenOptionsList>
      )}
    </TokenSelectWrapper>
  );
};

export default TokenDropdown;

