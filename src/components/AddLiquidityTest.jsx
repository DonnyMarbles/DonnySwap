import React, { useContext, useEffect, useState } from 'react';
import { Web3Context } from '../contexts/Web3Context';
import { ABIContext } from '../contexts/ABIContext';
import { TokenContext } from '../contexts/TokenContext';
import { ethers } from 'ethers';

const AddLiquidityTest = () => {
  const { provider, signer, account } = useContext(Web3Context);
  const { ERC20ABI, UniswapV2Router02ABI } = useContext(ABIContext);
  const { tokens, routerAddress } = useContext(TokenContext);
  const [wkrestContract, setWkrestContract] = useState(null);
  const [mrblContract, setMrblContract] = useState(null);
  const [routerContract, setRouterContract] = useState(null);

  useEffect(() => {
    if (signer) {
      const wkrestAddress = tokens['0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'].address;
      const mrblAddress = tokens['0xf5321b84aae2990fec72fd57af1b4a99b01eb928'].address;
      setWkrestContract(new ethers.Contract(wkrestAddress, ERC20ABI, signer));
      setMrblContract(new ethers.Contract(mrblAddress, ERC20ABI, signer));
      setRouterContract(new ethers.Contract(routerAddress, UniswapV2Router02ABI, signer));
    }
  }, [signer, tokens, routerAddress]);

  const approveTokens = async (tokenContract, amountToApprove, routerAddress) => {
    const allowance = await tokenContract.allowance(account, routerAddress);
    if (allowance.lt(amountToApprove)) {
      const approveTx = await tokenContract.approve(routerAddress, amountToApprove);
      await approveTx.wait();
      console.log(`Approved ${amountToApprove.toString()} tokens for ${tokenContract.address}`);
    } else {
      console.log(`Sufficient allowance for ${tokenContract.address}`);
    }
  };

  const addLiquidity = async () => {
    try {
      const amountADesired = ethers.utils.parseUnits("3", 18); // 3 WKREST
      const amountBDesired = ethers.utils.parseUnits("1800", 18); // 1800 MRBL

      // Approve tokens if not already approved
      await approveTokens(wkrestContract, amountADesired, routerAddress);
      await approveTokens(mrblContract, amountBDesired, routerAddress);

      // Add liquidity
      const addLiquidityTx = await routerContract.addLiquidity(
        tokens['0xdd11f4e48ce3a2b9043b2b0758ce704d3fd191dc'].address,
        tokens['0xf5321b84aae2990fec72fd57af1b4a99b01eb928'].address,
        amountADesired,
        amountBDesired,
        0, // amountAMin
        0, // amountBMin
        account,
        Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes deadline
        { gasLimit: 1000000 }
      );

      await addLiquidityTx.wait();
      console.log("Liquidity added.");
    } catch (error) {
      console.error("Error adding liquidity:", error);
    }
  };

  return (
    <div>
      <button onClick={addLiquidity}>Test Add Liquidity</button>
    </div>
  );
};

export default AddLiquidityTest;
