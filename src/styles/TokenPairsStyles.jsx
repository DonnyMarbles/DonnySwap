import styled from 'styled-components';

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  margin: 20px;
  background: #fcc375;
  border-radius: 10px;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-radius: 10px;

  thead {
    background: #dbaa65;
  }

  th, td {
    padding: 25px 15px;
    text-align: flex;
    border-bottom: 1px solid #dbaa65;
     background: #fcc375;
  }
  tbody{
    border-radius: 10px;
    
  }
  tr{
    border-radius: 10px;
  }
  td{
  border-radius: 10px;
  }
  th {
    background-color: #dbaa65;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: #dbaa65;
  }

  img {
    border-radius: 50%;
    width: 30x;
    height: 30px;
  }
`;

export const LogoCell = styled.td`
  display: flex;
  align-items: center;

  img {
    margin: 35px 35px;
    margin-right: 10px;
  }
`;

export const LoadingSpinner = styled.div`
  margin: 50px auto;
  text-align: center;
  img {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: block;
    margin: 0 auto;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  p {
    margin-top: 10px;
    font-size: 1.2rem;
    color: #333;
    font-weight: bold;
  }
`;

export const PercentageCell = styled.td`
  color: ${props => props.percentage > 0 ? 'green' : 'red'};
`;

export const GreyedOutUSD = styled.span`
  color: grey;
  font-size: 0.8em;
  display: flex;
`;