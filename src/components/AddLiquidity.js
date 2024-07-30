import React, { useState, useEffect } from 'react';
import { SelectContainer, Select, Input, Button, BalanceContainer, Balance, SectionTitle, Separator } from '../styles/StyledComponents';

const AddLiquidity = ({ web3, ERC20ABI, UniswapV2Router02ABI, balanceA, balanceB, setBalanceA, setBalanceB, tokenA, tokenB, setTokenA, setTokenB, tokenList }) => {
    const [amountA, setAmountA] = useState('');
    const [amountB, setAmountB] = useState('');
    const [approvalA, setApprovalA] = useState(false);
    const [approvalB, setApprovalB] = useState(false);

    useEffect(() => {
        if (web3 && tokenA && tokenB) {
            checkApprovals();
        }
    }, [web3, tokenA, tokenB, amountA, amountB]);

    const checkApprovals = async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const routerAddress = "0x107f729a0ca77F39901f073eC2104a3B736623f6";

            if (tokenA) {
                const tokenAContract = new web3.eth.Contract(ERC20ABI, tokenA);
                const allowanceA = await tokenAContract.methods.allowance(accounts[0], routerAddress).call();
                setApprovalA(web3.utils.fromWei(allowanceA, 'ether') >= amountA);
            }

            if (tokenB) {
                const tokenBContract = new web3.eth.Contract(ERC20ABI, tokenB);
                const allowanceB = await tokenBContract.methods.allowance(accounts[0], routerAddress).call();
                setApprovalB(web3.utils.fromWei(allowanceB, 'ether') >= amountB);
            }
        } catch (error) {
            console.error('Error checking approvals:', error);
        }
    };

    const handleApprove = async (token) => {
        try {
            const accounts = await web3.eth.getAccounts();
            const routerAddress = "0x107f729a0ca77F39901f073eC2104a3B736623f6";
            const tokenContract = new web3.eth.Contract(ERC20ABI, token);
            await tokenContract.methods.approve(routerAddress, web3.utils.toWei('999999', 'ether')).send({ from: accounts[0] });

            if (token === tokenA) {
                setApprovalA(true);
            } else {
                setApprovalB(true);
            }
        } catch (error) {
            console.error('Error approving token:', error);
        }
    };

    const handleAddLiquidity = async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const routerContract = new web3.eth.Contract(UniswapV2Router02ABI, "0x107f729a0ca77F39901f073eC2104a3B736623f6");
            await routerContract.methods.addLiquidity(
                tokenA,
                tokenB,
                web3.utils.toWei(amountA, 'ether'),
                web3.utils.toWei(amountB, 'ether'),
                0,
                0,
                accounts[0],
                Math.floor(Date.now() / 1000) + 60 * 20
            ).send({ from: accounts[0] });
        } catch (error) {
            console.error('Error adding liquidity:', error);
        }
    };

    return (
        <div>
            <SectionTitle>Add Liquidity</SectionTitle>
            <SelectContainer>
                <Select value={tokenA} onChange={e => setTokenA(e.target.value)} placeholder="Select Token A">
                    <option value="">Select Token A</option>
                    {Object.keys(tokenList).map(address => (
                        <option key={address} value={address}>
                            {tokenList[address].symbol}
                        </option>
                    ))}
                </Select>
                <Input value={amountA} onChange={e => setAmountA(e.target.value)} placeholder="Amount A" />
                {balanceA && (
                    <BalanceContainer>
                        <Balance>Balance: {balanceA}</Balance>
                    </BalanceContainer>
                )}
            </SelectContainer>
            <Separator />
            <SelectContainer>
                <Select value={tokenB} onChange={e => setTokenB(e.target.value)} placeholder="Select Token B">
                    <option value="">Select Token B</option>
                    {Object.keys(tokenList).map(address => (
                        <option key={address} value={address}>
                            {tokenList[address].symbol}
                        </option>
                    ))}
                </Select>
                <Input value={amountB} onChange={e => setAmountB(e.target.value)} placeholder="Amount B" />
                {balanceB && (
                    <BalanceContainer>
                        <Balance>Balance: {balanceB}</Balance>
                    </BalanceContainer>
                )}
            </SelectContainer>
            <div>
                {!approvalA && <Button onClick={() => handleApprove(tokenA)}>Approve Token A</Button>}
                {!approvalB && <Button onClick={() => handleApprove(tokenB)}>Approve Token B</Button>}
                {approvalA && approvalB && <Button onClick={handleAddLiquidity}>Add Liquidity</Button>}
            </div>
        </div>
    );
};

export default AddLiquidity;
