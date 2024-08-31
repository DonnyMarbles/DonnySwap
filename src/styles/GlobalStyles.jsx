import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  body {
    background-image: url(${props => props.backgroundImage});
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-attachment: fixed;
  }
`;
