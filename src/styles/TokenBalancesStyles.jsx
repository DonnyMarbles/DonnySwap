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
    background: #fcc375;
  }

  th, td {
    padding: 25px 15px;
     background: #fcc375;
    text-align: center;
    border-bottom: 1px solid #000;
    vertical-align: middle; /* Ensures that content aligns vertically */
    height: 60px; /* Set a fixed height for all table cells */
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
    width: 32px;
    height: 32px;
    display: block; /* Ensure the image is treated as a block element */
    margin: 0 auto; /* Center the image horizontally */
  }
`;

export const LogoCell = styled.td`
  height: 60px; /* Match the height of other cells to ensure consistency */
  padding: 0; /* Remove padding to prevent altering the row height */
  text-align: center; /* Center the content within the cell */
  vertical-align: middle; /* Ensure the image is vertically centered */
`;

export const PercentageCell = styled.td`
  color: ${props => props.percentage > 0 ? 'green' : 'red'};
  text-align: right;
  vertical-align: middle; /* Ensure the text is vertically centered */
`;
