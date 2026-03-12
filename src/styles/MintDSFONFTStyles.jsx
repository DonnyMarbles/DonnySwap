import styled from 'styled-components';

export const MintContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 20px;
  padding: 20px;
  background: #fcc375;
  border-radius: 10px;
  width: 100%;
  max-width: 400px;
  color: #000000;
`;

export const MintInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 10px 0;
  width: 100%;
  
`;

export const MintBackground = styled.img`
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-attachment: fixed;
  
`;
export const MintButton = styled.button`
  padding: 10px 20px;
  margin-top: 10px;
  border: none;
  border-radius: 5px;
  background: #dbaa65;
  color: #000;
  cursor: pointer;

  &:hover {
    background: #0056b3;
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

export const MintDetails = styled.div`
  margin-top: 15px;
  font-size: 0.9em;
  color: #2c2c2c;
`;

export const MintQuantityInput = styled.input`
  margin-left: 10px;
  padding: 5px 8px;
  width: 80px;
  border: 1px solid #b88c4a;
  border-radius: 4px;
  text-align: center;
  background: #fff5e6;
  color: #1b1b1b;
`;

export const ErrorMessage = styled.div`
  margin-top: 10px;
  color: #ff4d4d;
  font-size: 0.9em;
`;

export const LoadingSpinner = styled.div`
  margin-top: 10px;
  width: 24px;
  height: 24px;
  border: 4px solid #007bff;
  border-top: 4px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
