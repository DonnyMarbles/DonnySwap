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
    padding: 20px 15px;
    text-align: flex;
    border-bottom: 1px solid #ddd;
  }

  th {
    background-color: #1e1e1e;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: #1e1e1e;
  }

  img {
    border-radius: 50%;
    width: 32px;
    height: 32px;
  }
`;

export const LogoCell = styled.td`
  display: flex;
  align-items: center;

  img {
    margin: 20px 0;
    margin-right: 10px;
  }
`;

export const PercentageCell = styled.td`
  color: ${props => props.percentage > 0 ? 'green' : 'red'};
`;
