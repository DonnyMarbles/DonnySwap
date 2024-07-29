// GlobalStyles.js
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  body {
    font-family: 'Roboto', sans-serif;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background-color: #f5f5f5;
  }

  h1 {
    font-family: 'Roboto', sans-serif;
    font-weight: 700;
    background-color: #BB86FC;
  }

  input, button {
    font-family: 'Roboto', sans-serif;
    background-color: #BB86FC;
        &:hover {
        background-color: #2b0f3a;
    }
  }
`;

export default GlobalStyles;
