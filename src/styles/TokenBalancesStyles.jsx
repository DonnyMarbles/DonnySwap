import styled from 'styled-components';

export const TableContainer = styled.div`
  width: 100%;
  max-width: 100%;
  margin: clamp(1rem, 3vw, 1.5rem) auto;
  overflow: visible;
  background: #fcc375;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  padding: clamp(0.75rem, 2.5vw, 2rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 1.5rem);
`;

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: center;
`;

export const SearchInput = styled.input`
  flex: 1 1 220px;
  min-width: 200px;
  max-width: 360px;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #000;
  background: #f4d59f;
  color: #1b1309;
  font-size: 0.95rem;

  &:focus-visible {
    outline: 3px solid #0f62c2;
    outline-offset: 3px;
  }
`;

export const ToggleGroup = styled.div`
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
`;

export const ToggleButton = styled.button`
  border-radius: 999px;
  border: 1px solid #000;
  background: ${props => (props['aria-pressed'] ? '#0f62c2' : '#d3a35d')};
  color: ${props => (props['aria-pressed'] ? '#fff' : '#1b1309')};
  padding: 0.45rem 1rem;
  font-size: 0.9rem;
  transition: background 0.2s ease, color 0.2s ease;
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: clamp(0.75rem, 2vw, 1.25rem);
`;

export const StatCard = styled.div`
  padding: clamp(0.85rem, 2vw, 1.25rem);
  border-radius: 14px;
  background: linear-gradient(145deg, #ffdfb8, #f1b76c);
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.35);
  text-align: left;

  h4 {
    margin: 0 0 0.35rem;
    font-size: 0.9rem;
    color: #3a2712;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  p {
    margin: 0;
    font-size: clamp(1.1rem, 2.5vw, 1.65rem);
    font-weight: 700;
    color: #0e1612;
  }

  span {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.85rem;
    color: #2f2214;
    opacity: 0.8;
  }
`;

export const EmptyState = styled.div`
  padding: 2rem 1rem;
  text-align: center;
  border: 2px dashed rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  color: #1c140c;
  background: rgba(255, 255, 255, 0.35);
`;

export const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  background: rgba(252, 195, 117, 0.85);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const LogoCell = styled.td`
  height: 100%;
  padding: 6px;
  text-align: center;
  vertical-align: middle;
  width: 48px;

  @media (max-width: 900px) {
    width: auto;
    padding-bottom: 8px;
  }
`;

export const PercentageCell = styled.td`
  && {
    color: ${props => {
      const { percentage = 0, invertColors } = props;
      const numericValue =
        typeof percentage === 'number'
          ? percentage
          : parseFloat(String(percentage).replace(/[^\d.-]/g, '')) || 0;

      if (numericValue === 0) {
        return '#000';
      }

      if (invertColors) {
        return numericValue > 0 ? 'red' : 'green';
      }
      return numericValue > 0 ? 'green' : 'red';
    }};
  }
  text-align: right;
  vertical-align: middle;
  white-space: inherit;
  word-break: inherit;
  overflow-wrap: inherit;

  @media (max-width: 900px) {
    text-align: left;
  }
`;

export const BurnPercentageCell = styled(PercentageCell)`
  && {
    color: ${props => {
      const { percentage = 0 } = props;
      const numericValue =
        typeof percentage === 'number'
          ? percentage
          : parseFloat(String(percentage).replace(/[^\d.-]/g, '')) || 0;

      if (numericValue === 0) {
        return '#000';
      }

      return numericValue > 0 ? 'red' : 'green';
    }};
  }
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border-radius: 12px;
  overflow: hidden;

  thead {
    background: linear-gradient(135deg, #dbaa65, #c89552);
  }
  tbody {
    width: 100%;
  }

  th,
  td {
    padding: clamp(0.65rem, 0.9vw, 0.95rem) clamp(0.5rem, 0.9vw, 0.85rem);
    font-size: clamp(0.82rem, 0.95vw, 1rem);
    line-height: 1.25;
    background: rgba(252, 195, 117, 0.9);
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    vertical-align: middle;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  th {
    word-break: normal;
    overflow-wrap: normal;
  }

  th .label {
    display: block;
    line-height: 1.2;
    white-space: normal;
    word-break: normal;
  }

  .numeric {
    display: inline-flex;
    justify-content: flex-end;
    max-width: 100%;
    font-size: inherit;
    line-height: inherit;
    white-space: normal;
    word-break: break-word;
    text-align: inherit;
    font-variant-numeric: tabular-nums;
    color: inherit;
  }

  .numeric.positive {
    color: green;
  }

  .numeric.burn {
    color: red;
  }

  /* Column alignment + numeric consistency */
  td:nth-child(2) {
    text-align: left;
  }

  td:nth-child(4),
  td:nth-child(5),
  td:nth-child(6),
  td:nth-child(7),
  td:nth-child(8),
  td:nth-child(10),
  td:nth-child(11) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  td:nth-child(2),
  td:nth-child(3),
  td:nth-child(4),
  td:nth-child(5),
  td:nth-child(6),
  td:nth-child(7),
  td:nth-child(8),
  td:nth-child(10) {
    color: #000;
  }

  th {
    background-color: #dbaa65;
    color: #000000;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: rgba(217, 164, 89, 0.4);
  }

  img {
    width: 32px;
    height: 32px;
    display: block; /* Ensure the image is treated as a block element */
    margin: 0 auto; /* Center the image horizontally */
  }
  @media (max-width: 900px) {
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
      gap: 0.5rem;
      padding: 1rem;
      border: 1px solid #dbaa65;
      border-radius: 12px;
      background: #fde1b4;
    }

    td, ${LogoCell}, ${PercentageCell} {
      border: none;
      text-align: left;
      padding: 0;
      background: transparent;
      white-space: normal;
    }

    td::before {
      content: attr(data-label);
      font-weight: 600;
      display: inline-block;
      width: 55%;
      max-width: 180px;
    }

    ${LogoCell} {
      justify-content: flex-start;
    }
  }
`;
export const LogoButton = styled.button`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
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

export const SortButton = styled.button`
  width: 100%;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  padding: 0;
  text-transform: none;

  &:hover {
    text-decoration: underline;
  }

  .indicator {
    font-size: 0.85em;
  }
`;
