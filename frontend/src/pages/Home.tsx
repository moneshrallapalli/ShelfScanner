import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import { useAnalytics, usePageTracking } from '../services/analytics';

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


const Home: React.FC = () => {
  const navigate = useNavigate();
  const analyticsHook = useAnalytics();
  
  usePageTracking('home', 'Home - Shelf Scanner');

  const handlePreferencesClick = () => {
    analyticsHook.trackUserAction('navigate_to_preferences');
    navigate('/preferences');
  };

  const handleScannerClick = () => {
    analyticsHook.trackUserAction('navigate_to_scanner');
    navigate('/scanner');
  };

  return (
    <Container>
      <Title>📚 Shelf Scanner</Title>
      <Subtitle>
        Discover your next great read! Take a photo of any bookshelf 
        and get personalized recommendations based on your reading preferences.
      </Subtitle>
      
      <Button variant="primary" size="large" onClick={handlePreferencesClick}>
        Set Reading Preferences
      </Button>
      
      <Button variant="primary" size="large" onClick={handleScannerClick}>
        Scan Bookshelf
      </Button>
    </Container>
  );
};

export default Home;