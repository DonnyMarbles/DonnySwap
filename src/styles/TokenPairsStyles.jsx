import styled from 'styled-components';

export const TableContainer = styled.div`
  width: 100%;
  max-width: 100%;
  margin: clamp(1rem, 3vw, 1.5rem) auto;
  background: #fcc375;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  padding: clamp(0.75rem, 2.5vw, 2rem);
  overflow: visible;
  color: #0f0f0f;
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 1.5rem);
`;

export const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
`;

export const ToolbarControls = styled.div`
  width: 100%;
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

export const ToolbarStatsGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: clamp(0.6rem, 1.25vw, 1.1rem);
`;

export const ToolbarStatCard = styled.div`
  padding: clamp(0.85rem, 2vw, 1.15rem);
  border-radius: 14px;
  background: linear-gradient(145deg, #ffe6c8, #f3bb76);
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.35);

  h4 {
    margin: 0 0 0.3rem;
    font-size: 0.85rem;
    color: #402b14;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  p {
    margin: 0;
    font-size: clamp(1.05rem, 2.3vw, 1.45rem);
    font-weight: 700;
    color: #0e1612;
  }

  span {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.82rem;
    color: #2c1f12;
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

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-radius: 12px;
  table-layout: fixed;
  overflow: hidden;

  thead {
    background: linear-gradient(135deg, #dbaa65, #c89552);
  }

  th,
  td {
    padding: clamp(0.6rem, 0.9vw, 0.9rem) clamp(0.4rem, 0.8vw, 0.8rem);
    font-size: clamp(0.82rem, 0.95vw, 1rem);
    line-height: 1.25;
    text-align: center;
    background: #f4d59f;
    color: #16120b;
    word-break: break-word;
  }

  th {
    font-weight: 600;
    letter-spacing: 0.03em;
    background-color: #dbaa65;
  }

  tbody tr:nth-child(even) {
    background-color: rgba(217, 164, 89, 0.35);
  }

  td:nth-child(3),
  td:nth-child(4),
  td:nth-child(5),
  td:nth-child(6),
  td:nth-child(7),
  td:nth-child(9),
  td:nth-child(10) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }


  td:nth-child(5),
  td:nth-child(7),
  td:nth-child(8) {
    color: #118347;
  }
  td:nth-child(9),
  td:nth-child(10) {
    color: red;
  }
  td.inline-cell {
    white-space: normal;
  }

  td.inline-cell .inline-cell-content {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    column-gap: 0.35rem;
    row-gap: 0.15rem;
    width: 100%;
  }

  td.inline-cell .inline-cell-content > * {
    white-space: nowrap;
  }

  td.inline-cell .token-link {
    display: inline-flex;
    align-items: baseline;
    gap: 0.2rem;
    color: inherit;
  }

  td.inline-cell .amount {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  td.inline-cell .ticker {
    font-size: 0.9em;
  }

  td.inline-cell .divider {
    opacity: 0.6;
    font-weight: 600;
  }

  td.stacked-cell {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-top: clamp(0.7rem, 1vw, 1rem);
    padding-bottom: clamp(0.7rem, 1vw, 1rem);
  }

  td.stacked-cell .stacked-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0.2rem;
    width: 100%;
  }

  td.stacked-cell .value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #1f1208;
  }

  td.stacked-cell .meta {
    display: block;
    font-size: 0.78em;
    color: #60401b;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  td.stacked-cell .stacked-row + .stacked-row {
    padding-top: 0.35rem;
    margin-top: 0.15rem;
    border-top: 1px dashed rgba(54, 34, 14, 0.15);
    width: 100%;
  }

  img {
    border-radius: 50%;
    width: 32px;
    height: 32px;
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
      gap: 0.65rem;
      padding: 1rem;
      border: 1px solid #dbaa65;
      border-radius: 12px;
      background: #fde1b4;
    }

    td,
    th {
      border: none;
      background: transparent;
      padding: 0;
      text-align: left;
    }

    td {
      display: block;
    }

    td.inline-cell .inline-cell-content {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      column-gap: 0.35rem;
      row-gap: 0.2rem;
    }

    td.stacked-cell {
      padding: 0;
    }

    td::before {
      content: attr(data-label);
      font-weight: 600;
      display: block;
      margin-bottom: 0.25rem;
      color: #3a2a14;
    }

    td[data-label='Logos'] {
      display: flex;
      align-items: center;
      gap: 16px;
    }
  }
`;

export const LogoCell = styled.td`
  vertical-align: middle;

  .logos {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
  }

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  img {
    margin: 0;
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

export const PercentageCell = styled.td.withConfig({
  shouldForwardProp: prop => prop !== 'forceGreen',
})`
  color: ${props => (props.forceGreen ? '#118347' : props.percentage > 0 ? 'green' : 'red')};
  text-align: right;
`;

export const GreyedOutUSD = styled.span`
  color: grey;
  font-size: 0.8em;
  display: flex;
`;