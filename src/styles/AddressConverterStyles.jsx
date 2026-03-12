import styled from 'styled-components';

export const ConverterContainer = styled.div`
  width: min(100%, 640px);
  margin: clamp(1rem, 3vw, 1.5rem) auto;
  padding: clamp(1rem, 3vw, 1.75rem);
  background: #fcc375;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  color: #000000;
`;

export const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 16px;

  @media (min-width: 720px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

export const Input = styled.input`
  background-color: #dbaa65;
  padding: 12px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #000;
  width: 100%;
`;

export const Dropdown = styled.select`
  background-color: #dbaa65;
  padding: 12px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #000;
  color: #000;
  width: 100%;

  @media (min-width: 720px) {
    width: 240px;
  }
`;

export const ConvertButton = styled.button`
  padding: 12px 20px;
  font-size: 1rem;
  background-color: #dbaa65;
  color: #000;
  border: 1px solid #000;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #003d80;
    color: #fff;
  }
`;

export const Error = styled.div`
  color: red;
  font-size: 14px;
  margin-top: 10px;
`;

export const OutputAddress = styled.div`
  margin-top: 20px;
  font-size: 1rem;
  font-weight: bold;
  text-align: left;
  word-break: break-word;
`;

export const InfoText = styled.div`
  margin-top: 30px;
  text-align: center;

  h2 {
    font-size: 1rem;
    margin-bottom: 10px;
  }

  h3 {
    font-size: 0.95rem;
    color: #000;
  }
`;
