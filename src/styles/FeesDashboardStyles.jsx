import styled from 'styled-components';

export const DashboardContainer = styled.div`
  width: 100%;
  margin: clamp(1rem, 3vw, 1.5rem) auto;
  background: #fcc375;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  color: #000000;
  padding: clamp(1rem, 3vw, 1.5rem);
`;

export const TableWrapper = styled.div`
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  background: #f9d39f;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  thead {
    background: #dbaa65;
    border-radius: 12px;
  }
  tbody{
    width: 100%;
    border-radius: 12px;
  }
  th, td {
    padding: clamp(1rem, 2vw, 1.5rem);
     background: #f9d39f;
    text-align: center;
    border-bottom: 1px solid #dbaa65;
    vertical-align: middle; /* Ensures that content aligns vertically */
    height: auto;
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

  @media (max-width: 768px) {
    thead {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }

    tbody {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    tr {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid #dbaa65;
      border-radius: 12px;
      background: #fde1b4;
    }

    td {
      border: none;
      text-align: left;
      background: transparent;
      padding: 0;
    }

    td::before {
      content: attr(data-label);
      font-weight: 600;
      display: inline-block;
      margin-right: 0.5rem;
    }
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
