import styled from 'styled-components';

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  margin: 20px 0;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;

  thead {
    background: #1e1e1e;
  }

  th, td {
    padding: 25px 15px;
    text-align: flex;
    border-bottom: 1px solid #ddd;
     background: #fcc375;
  }

  th {
    background-color: #dbaa65;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: #1e1e1e;
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

export const PercentageCell = styled.td`
  color: ${props => props.percentage > 0 ? 'green' : 'red'};
`;
