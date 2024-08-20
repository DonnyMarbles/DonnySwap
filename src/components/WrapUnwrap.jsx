import React, { useEffect, useContext, useState } from 'react';
import { ethers } from 'ethers';
import { SwapButton } from '../styles/SwapStyles';
import { TokenContext } from '../contexts/TokenContext';
import { Web3Context } from '../contexts/Web3Context';

const WrapUnwrap = ({ tokenA, tokenB, amountA, amountB, setAmountB, provider, WKRESTAddress, WrappedKRESTABI }) => {
  const { tokens } = useContext(TokenContext);
  const { account } = useContext(Web3Context);
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
  
      const signer = provider.getSigner();
      const contract = new ethers.Contract(WKRESTAddress, WrappedKRESTABI, signer);
  
      // Ensure amountA is a string
      const amountInWei = ethers.utils.parseEther(amountA.toString()); // Convert amountA to a string
  
      const tx = tokenA === 'KRST'
        ? await contract.deposit({ value: amountInWei }) // Directly pass the BigNumber
        : await contract.withdraw(amountInWei); // Directly pass the BigNumber
  
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
        : await new ethers.Contract(tokens[tokenA].address, WrappedKRESTABI, provider).balanceOf(account);
      const balanceOut = tokenB === 'KRST'
        ? await provider.getBalance(account)
        : await new ethers.Contract(tokens[tokenB].address, WrappedKRESTABI, provider).balanceOf(account);

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
