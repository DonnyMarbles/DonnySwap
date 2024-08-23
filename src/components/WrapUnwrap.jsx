import React, { useEffect, useState, useContext } from 'react';
import { ethers } from 'ethers';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { SwapButton } from '../styles/SwapStyles';
import { TokenContext } from '../contexts/TokenContext';

const WrapUnwrap = ({ tokenA, tokenB, amountA, amountB, setAmountB, WKRESTAddress, WrappedKRESTABI }) => {
  const { tokens } = useContext(TokenContext);
  const { address: account } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  const [updateBalance, setUpdateBalance] = useState(false);

  useEffect(() => {
    setAmountB(amountA); // 1:1 ratio for wrapping/unwrapping
  }, [amountA, setAmountB]);

  useEffect(() => {
    if (updateBalance) {
      checkBalances();
      setUpdateBalance(false);
    }
  }, [updateBalance]);

  const handleWrapUnwrap = async () => {
    try {
      if (!amountA || parseFloat(amountA) <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const contract = new ethers.Contract(WKRESTAddress, WrappedKRESTABI, signer);

      // Convert amountA to a string and parse it as a BigNumber in Wei
      const amountInWei = ethers.utils.parseEther(amountA.toString());

      const tx = tokenA === 'KRST'
        ? await contract.deposit({ value: amountInWei })
        : await contract.withdraw(amountInWei);

      await tx.wait();
      alert(`${getTokenSymbol(tokenA)} swapped to ${getTokenSymbol(tokenB)} successfully`);
      setUpdateBalance(true);
    } catch (err) {
      console.error("Error wrapping/unwrapping tokens:", err);
      alert(`Error wrapping/unwrapping tokens: ${err.message}`);
    }
  };

  const getTokenSymbol = (address) => tokens[address]?.symbol || address;
  const getTokenLogo = (address) => tokens[address]?.logo || '';

  const checkBalances = async () => {
    if (account) {
      const balanceIn = tokenA === 'KRST'
        ? await provider.getBalance(account)
        : await new ethers.Contract(WKRESTAddress, WrappedKRESTABI, provider).balanceOf(account);
      const balanceOut = tokenB === 'KRST'
        ? await provider.getBalance(account)
        : await new ethers.Contract(WKRESTAddress, WrappedKRESTABI, provider).balanceOf(account);

      document.querySelector(`#balance-${tokenA}`).innerText = ethers.utils.formatUnits(balanceIn, 18);
      document.querySelector(`#balance-${tokenB}`).innerText = ethers.utils.formatUnits(balanceOut, 18);
    }
  };

  return (
    <>
      <SwapButton onClick={handleWrapUnwrap}>
        {tokenA === 'KRST' ? 'Wrap KREST' : 'Unwrap KREST'}
      </SwapButton>
      <div>
        1 <img src={getTokenLogo(tokenA === 'KRST' ? 'KRST' : WKRESTAddress)} alt="Token Logo" width="20" /> {getTokenSymbol(tokenA === 'KRST' ? 'KRST' : WKRESTAddress)} 
        = 1 <img src={getTokenLogo(tokenB === 'KRST' ? 'KRST' : WKRESTAddress)} alt="Token Logo" width="20" /> {getTokenSymbol(tokenB === 'KRST' ? 'KRST' : WKRESTAddress)}
      </div>
    </>
  );
};

export default WrapUnwrap;
