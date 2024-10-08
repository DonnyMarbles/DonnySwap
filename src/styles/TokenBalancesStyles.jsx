import styled from 'styled-components';

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  margin: 20px;
  background: #fcc375;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  thead {
    background: #fcc375;
  }
  tbody{
    width: 100%;
  }
  th, td {
    padding: 25px 15px;
     background: #fcc375;
    text-align: center;
    border-bottom: 1px solid #dbaa65;
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
  text-align: right;
  vertical-align: middle; /* Ensure the text is vertically centered */
`;
