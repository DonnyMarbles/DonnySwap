import styled from 'styled-components';

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  margin: 0; /* Removed extra margin */
  padding: 0; /* Ensure no padding is applied */
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 0; /* Remove any margin to avoid misalignment */

  thead {
    background: #1e1e1e;
  }

  th, td {
    padding: 20px 15px;
    text-align: center;
    border: 1px solid #ddd; /* Ensure consistent border */
    vertical-align: middle;
    height: 60px;
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
    display: block;
    margin: 0 auto;
  }
`;

export const LogoCell = styled.td`
  height: 60px;
  padding: 0;
  text-align: center;
  vertical-align: middle;
`;

export const PercentageCell = styled.td`
  color: ${props => props.percentage > 0 ? 'green' : 'red'};
  text-align: right;
  vertical-align: middle;
`;

// To ensure the rows and table cells are perfectly aligned
export const TableRow = styled.tr`
  display: table-row;
  width: 100%; /* Ensure the row takes the full width of the table */
  margin: 0;
  padding: 0;
  border-spacing: 0; /* Ensure there’s no additional spacing between cells */
  border: 1px solid #ddd; /* Ensure consistent border around the row */
`;
