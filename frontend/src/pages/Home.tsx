import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  padding: 2rem;
  text-align: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #2d3748;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #4a5568;
  margin-bottom: 3rem;
  line-height: 1.6;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  margin: 0.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Title>📚 Shelf Scanner</Title>
      <Subtitle>
        Discover your next great read! Take a photo of any bookshelf 
        and get personalized recommendations based on your reading preferences.
      </Subtitle>
      
      <Button onClick={() => navigate('/preferences')}>
        Set Reading Preferences
      </Button>
      
      <Button onClick={() => navigate('/scanner')}>
        Scan Bookshelf
      </Button>
    </Container>
  );
};

export default Home;