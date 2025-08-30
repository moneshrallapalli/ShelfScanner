import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  padding: 2rem;
  min-height: 100vh;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: #2d3748;
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #4a5568;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  margin-top: 1rem;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const BackButton = styled.button`
  background: transparent;
  border: 2px solid #e2e8f0;
  color: #4a5568;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 1rem;
`;

const Preferences: React.FC = () => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    favoriteGenres: '',
    favoriteAuthors: '',
    minRating: '3.0',
    readingFrequency: 'weekly',
    bookLength: 'any'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save preferences to session/local storage
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    alert('Preferences saved!');
    navigate('/scanner');
  };

  return (
    <Container>
      <BackButton onClick={() => navigate('/')}>
        ← Back
      </BackButton>
      
      <Title>📖 Reading Preferences</Title>
      
      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Favorite Genres (comma-separated)</Label>
          <Input
            type="text"
            placeholder="e.g., Fantasy, Mystery, Romance"
            value={preferences.favoriteGenres}
            onChange={(e) => setPreferences({...preferences, favoriteGenres: e.target.value})}
          />
        </FormGroup>

        <FormGroup>
          <Label>Favorite Authors (comma-separated)</Label>
          <Input
            type="text"
            placeholder="e.g., Agatha Christie, Brandon Sanderson"
            value={preferences.favoriteAuthors}
            onChange={(e) => setPreferences({...preferences, favoriteAuthors: e.target.value})}
          />
        </FormGroup>

        <FormGroup>
          <Label>Minimum Rating</Label>
          <Select
            value={preferences.minRating}
            onChange={(e) => setPreferences({...preferences, minRating: e.target.value})}
          >
            <option value="3.0">3.0+ stars</option>
            <option value="3.5">3.5+ stars</option>
            <option value="4.0">4.0+ stars</option>
            <option value="4.5">4.5+ stars</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Reading Frequency</Label>
          <Select
            value={preferences.readingFrequency}
            onChange={(e) => setPreferences({...preferences, readingFrequency: e.target.value})}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Preferred Book Length</Label>
          <Select
            value={preferences.bookLength}
            onChange={(e) => setPreferences({...preferences, bookLength: e.target.value})}
          >
            <option value="any">Any length</option>
            <option value="short">Short (&lt;200 pages)</option>
            <option value="medium">Medium (200-400 pages)</option>
            <option value="long">Long (400+ pages)</option>
          </Select>
        </FormGroup>

        <Button type="submit">
          Save Preferences
        </Button>
      </form>
    </Container>
  );
};

export default Preferences;