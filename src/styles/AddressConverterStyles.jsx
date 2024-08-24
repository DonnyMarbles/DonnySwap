import styled from 'styled-components';

export const ConverterContainer = styled.div`
  background: #fcc375;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  padding: 20px;
  border-radius: 10px;
`;

export const InputContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
`;

export const Input = styled.input`
  background-color: #dbaa65;
  padding: 10px;
  font-size: 16px;
  border-radius: 5px;
  border: 1px solid #000;
  width: 300px;
`;

export const Dropdown = styled.select`
  background-color: #dbaa65;
  padding: 10px;
  font-size: 16px;
  border-radius: 5px;
  border: 1px solid #000;
  color: #000;
`;

export const ConvertButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  background-color: #dbaa65;
  color: #000;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid #000;
  &:hover {
    background-color: #003d80;
  }
`;

export const Error = styled.div`
  color: red;
  font-size: 14px;
  margin-top: 10px;
`;

export const OutputAddress = styled.div`
  margin-top: 20px;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
`;

export const InfoText = styled.div`
  margin-top: 30px;
  text-align: center;

  h2 {
    font-size: 18px;
    margin-bottom: 10px;
  }

  h3 {
    font-size: 16px;
    color: #000;
  }
`;
