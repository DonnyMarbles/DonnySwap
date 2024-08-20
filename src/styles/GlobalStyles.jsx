import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: 'Roboto', sans-serif;
    justify-content: center;
    background: #121212;
    color: #fff;
  }

  h2 {
    color: #007bff;
  }

  input, select {
    color: #fff;
  }
`;

export default GlobalStyle;
