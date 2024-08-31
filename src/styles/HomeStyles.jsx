import styled from 'styled-components';

export const HomeContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  margin: 20px;
  background: #fcc375;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  background: #fcc375;
`;

export const SectionHeader = styled.h1`
  padding-top: 30px;
  text-align: center;
  font-size: 2rem;
  margin-bottom: 20px;
`;

export const SubSectionHeader = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 10px;
`;

export const FeatureList = styled.ol`
  list-style-type: none;
  padding-bottom: 30px;
`;

export const FeatureItem = styled.li`
  margin-bottom: 20px;
`;

export const TokenInfo = styled.div`
  margin-top: 10px;
`;

export const TokenImage = styled.img`
  vertical-align: middle;
`;

export const ContractLink = styled.a`
  color: #007bff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const ExternalLink = styled.a`
  color: #007bff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const Note = styled.h3`
  font-size: 1rem;
  color: #d9534f;
  margin-top: 20px;
`;
