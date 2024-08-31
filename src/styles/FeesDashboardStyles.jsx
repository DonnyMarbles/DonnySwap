import styled from 'styled-components';

export const DashboardContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  margin: 20px;
  background: #fcc375;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

export const Table = styled.table`
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
     background: #f9d39f;
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
    background-color: #f9d39f;
  }

  img {
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: block; /* Ensure the image is treated as a block element */
    margin: 0 auto; /* Center the image horizontally */
  }
`;

export const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #f3d2a0;
  }
`;

export const TableCell = styled.td`
  text-align: left;
  background-color: #f9d39f;

`;

export const TableHead = styled.th`
  text-align: left;
  background-color: #fcc375;
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


export const ErrorMessage = styled.div`
  margin: 20px 0;
  padding: 12px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  text-align: center;
`;

export const InfoContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #fcc375;
  border-radius: 10px;
`;

export const InfoItem = styled.div`
  font-size: 1.2rem;
  color: #333;
  font-weight: bold;
  text-align: center;
`;

export const InfoLabel = styled.div`
  font-size: 1rem;
  color: #555;
`;

export const InfoValue = styled.div`
  font-size: 1.5rem;
  color: #000;
  font-weight: bold;
`;