import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { apiService, Preferences } from '../services/api';
import Button from '../components/UI/Button';
import { FullPageLoading, InlineLoading } from '../components/UI/LoadingStates';
import { ErrorState, NetworkError } from '../components/UI/ErrorStates';
import { useAnalytics, usePageTracking } from '../services/analytics';

const Container = styled.div`
  padding: 1rem;
  min-height: 100vh;
  background: #f8fafc;
`;

const Header = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #2d3748;
`;

const Subtitle = styled.p`
  color: #4a5568;
  margin-bottom: 1rem;
`;

const StepsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
`;

const Step = styled.div<{ active: boolean; completed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => 
    props.completed ? '#48bb78' :
    props.active ? '#667eea' : '#e2e8f0'
  };
  color: ${props => (props.active || props.completed) ? 'white' : '#a0aec0'};
  font-weight: bold;
  margin: 0 0.5rem;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -20px;
    width: 20px;
    height: 2px;
    background: ${props => props.completed ? '#48bb78' : '#e2e8f0'};
    top: 50%;
    transform: translateY(-50%);
  }
`;

const FormContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  font-weight: bold;
  color: #2d3748;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #4a5568;
  font-size: 0.95rem;
`;

const Input = styled.input`
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

const CheckboxGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #667eea;
    background: #f7fafc;
  }
  
  input[type="checkbox"] {
    margin-right: 0.5rem;
    accent-color: #667eea;
  }
`;

const RangeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const RangeInput = styled.input`
  width: 100%;
  accent-color: #667eea;
`;

const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #4a5568;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;


const QuickSetupCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const QuickSetupButton = styled(Button)`
  background: white;
  color: #667eea;
  margin-top: 1rem;
  
  &:hover {
    background: #f7fafc;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #4a5568;
  gap: 0.5rem;
`;

const ErrorMessage = styled.div`
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  text-align: center;
`;

const SuccessMessage = styled.div`
  background: #c6f6d5;
  color: #2d7d32;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  text-align: center;
`;

const AVAILABLE_GENRES = [
  'Fiction', 'Non-Fiction', 'Mystery', 'Thriller', 'Romance', 'Fantasy',
  'Science Fiction', 'Historical Fiction', 'Literary Fiction', 'Biography',
  'Memoir', 'Self-Help', 'Business', 'Psychology', 'Philosophy',
  'History', 'Science', 'Politics', 'Religion', 'Health',
  'Cooking', 'Travel', 'Art', 'Music', 'Sports', 'Technology',
  'Poetry', 'Drama', 'Horror', 'Adventure', 'Young Adult'
];

interface PreferencesPageProps {}

const PreferencesPage: React.FC<PreferencesPageProps> = () => {
  const navigate = useNavigate();
  const analyticsHook = useAnalytics();
  const [currentStep, setCurrentStep] = useState(1);
  
  usePageTracking('preferences', 'Preferences - Set Reading Preferences');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(true);
  
  const [preferences, setPreferences] = useState<Partial<Preferences>>({
    favoriteGenres: [],
    avoidGenres: [],
    preferredAuthors: [],
    readingLevel: 'any',
    ratingThresholds: {
      minimumRating: 3.0,
      minimumReviewCount: 50,
      preferHighlyRated: true
    },
    contentPreferences: {
      violence: 'any',
      profanity: 'any',
      adult: 'any',
      religiousContent: 'any',
      politicalContent: 'any'
    },
    discoverySettings: {
      includeNewReleases: true,
      includeClassics: true,
      includeDiverseAuthors: true,
      includeTranslations: false,
      experimentWithGenres: true
    },
    recommendations: {
      maxResults: 10,
      includePopular: true,
      includeSimilar: true,
      includeAwards: true,
      diversityLevel: 'balanced'
    },
    readingGoals: {
      booksPerMonth: undefined,
      pagesPerDay: undefined,
      preferredLength: 'any',
      seriesPreference: 'mixed'
    },
    goodreadsIntegration: {
      enabled: false,
      importToRead: false,
      importRatings: false,
      syncProgress: false
    }
  });

  useEffect(() => {
    loadExistingPreferences();
  }, []);

  const loadExistingPreferences = async () => {
    try {
      const existing = await apiService.getPreferences();
      if (existing) {
        setPreferences(existing);
        setShowQuickSetup(false);
        setCurrentStep(1);
      }
    } catch (error) {
      // No existing preferences, show quick setup
      console.log('No existing preferences found');
    }
  };

  const handleQuickSetup = async () => {
    setIsLoading(true);
    setError(null);
    
    analyticsHook.trackUserAction('quick_setup_started');
    
    try {
      const quickPrefs = {
        favoriteGenres: ['Fiction', 'Mystery'],
        readingLevel: 'any',
        minimumRating: 3.5,
        contentSensitivity: 'moderate'
      };
      
      await apiService.quickSetupPreferences(quickPrefs);
      setSuccess('Quick preferences set! You can customize them below or start scanning.');
      setShowQuickSetup(false);
      await loadExistingPreferences();
      
      analyticsHook.trackPreferencesUpdate(2, quickPrefs.favoriteGenres);
      analyticsHook.trackUserAction('quick_setup_completed');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save quick preferences');
      analyticsHook.trackError('quick_setup_failed', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreToggle = (genre: string, isAvoid: boolean = false) => {
    const key = isAvoid ? 'avoidGenres' : 'favoriteGenres';
    const current = preferences[key] as string[] || [];
    
    if (current.includes(genre)) {
      setPreferences({
        ...preferences,
        [key]: current.filter(g => g !== genre)
      });
    } else {
      setPreferences({
        ...preferences,
        [key]: [...current, genre]
      });
    }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    analyticsHook.trackUserAction('save_detailed_preferences');
    
    try {
      let session = await apiService.getSession();
      if (!session) {
        session = await apiService.createSession('web-preferences');
      }

      await apiService.updatePreferences(preferences);
      setSuccess('Preferences saved successfully! 🎉');
      
      const genres = (preferences.favoriteGenres || []) as string[];
      analyticsHook.trackPreferencesUpdate(genres.length, genres);
      analyticsHook.trackUserAction('preferences_save_completed');
      
      setTimeout(() => {
        navigate('/scanner');
      }, 2000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save preferences');
      analyticsHook.trackError('preferences_save_failed', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const renderQuickSetup = () => (
    <QuickSetupCard>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚀</div>
      <h2 style={{ margin: '0 0 1rem 0' }}>Quick Setup</h2>
      <p style={{ margin: '0 0 1rem 0', opacity: 0.9 }}>
        New to Shelf Scanner? Get started in 30 seconds with our smart defaults,
        then customize your preferences later.
      </p>
      <QuickSetupButton onClick={handleQuickSetup} disabled={isLoading}>
        {isLoading ? 'Setting up...' : '✨ Quick Setup & Start Scanning'}
      </QuickSetupButton>
      <div style={{ marginTop: '1rem' }}>
        <button 
          onClick={() => setShowQuickSetup(false)}
          style={{ 
            background: 'transparent', 
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Customize Preferences Instead
        </button>
      </div>
    </QuickSetupCard>
  );

  const renderStep1 = () => (
    <FormContainer>
      <SectionTitle>📚 Genre Preferences</SectionTitle>
      
      <FormGroup>
        <Label>Favorite Genres (select all that apply)</Label>
        <CheckboxGroup>
          {AVAILABLE_GENRES.slice(0, 12).map(genre => (
            <CheckboxItem key={genre}>
              <input
                type="checkbox"
                checked={(preferences.favoriteGenres || []).includes(genre)}
                onChange={() => handleGenreToggle(genre, false)}
              />
              {genre}
            </CheckboxItem>
          ))}
        </CheckboxGroup>
      </FormGroup>

      <FormGroup style={{ marginTop: '1.5rem' }}>
        <Label>Genres to Avoid (optional)</Label>
        <CheckboxGroup>
          {['Horror', 'Erotica', 'Self-Help', 'Politics', 'Religion'].map(genre => (
            <CheckboxItem key={genre}>
              <input
                type="checkbox"
                checked={(preferences.avoidGenres || []).includes(genre)}
                onChange={() => handleGenreToggle(genre, true)}
              />
              {genre}
            </CheckboxItem>
          ))}
        </CheckboxGroup>
      </FormGroup>
    </FormContainer>
  );

  const renderStep2 = () => (
    <FormContainer>
      <SectionTitle>⭐ Quality & Content Filters</SectionTitle>
      
      <FormGrid>
        <FormGroup>
          <Label>Minimum Rating</Label>
          <RangeContainer>
            <RangeInput
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={preferences.ratingThresholds?.minimumRating || 3.0}
              onChange={(e) => setPreferences({
                ...preferences,
                ratingThresholds: {
                  ...preferences.ratingThresholds!,
                  minimumRating: parseFloat(e.target.value)
                }
              })}
            />
            <RangeLabels>
              <span>1.0 stars</span>
              <span>{preferences.ratingThresholds?.minimumRating || 3.0}/5.0</span>
              <span>5.0 stars</span>
            </RangeLabels>
          </RangeContainer>
        </FormGroup>

        <FormGroup>
          <Label>Minimum Number of Reviews</Label>
          <Select
            value={preferences.ratingThresholds?.minimumReviewCount || 50}
            onChange={(e) => setPreferences({
              ...preferences,
              ratingThresholds: {
                ...preferences.ratingThresholds!,
                minimumReviewCount: parseInt(e.target.value)
              }
            })}
          >
            <option value={10}>10+ reviews</option>
            <option value={50}>50+ reviews</option>
            <option value={100}>100+ reviews</option>
            <option value={500}>500+ reviews</option>
            <option value={1000}>1000+ reviews</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Reading Level</Label>
          <Select
            value={preferences.readingLevel || 'any'}
            onChange={(e) => setPreferences({
              ...preferences,
              readingLevel: e.target.value as any
            })}
          >
            <option value="beginner">Beginner (Easy reads)</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced (Complex works)</option>
            <option value="any">Any Level</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Content Sensitivity</Label>
          <Select
            value={preferences.contentPreferences?.violence || 'any'}
            onChange={(e) => setPreferences({
              ...preferences,
              contentPreferences: {
                ...preferences.contentPreferences!,
                violence: e.target.value,
                profanity: e.target.value,
                adult: e.target.value
              }
            })}
          >
            <option value="avoid">Conservative (Avoid mature content)</option>
            <option value="limit">Moderate (Limited mature content)</option>
            <option value="any">Open (No restrictions)</option>
          </Select>
        </FormGroup>
      </FormGrid>
    </FormContainer>
  );

  const renderStep3 = () => (
    <FormContainer>
      <SectionTitle>🎯 Discovery & Goals</SectionTitle>
      
      <FormGroup>
        <Label>Discovery Preferences</Label>
        <CheckboxGroup>
          <CheckboxItem>
            <input
              type="checkbox"
              checked={preferences.discoverySettings?.includeNewReleases || false}
              onChange={(e) => setPreferences({
                ...preferences,
                discoverySettings: {
                  ...preferences.discoverySettings!,
                  includeNewReleases: e.target.checked
                }
              })}
            />
            Include New Releases (last 2 years)
          </CheckboxItem>
          <CheckboxItem>
            <input
              type="checkbox"
              checked={preferences.discoverySettings?.includeClassics || false}
              onChange={(e) => setPreferences({
                ...preferences,
                discoverySettings: {
                  ...preferences.discoverySettings!,
                  includeClassics: e.target.checked
                }
              })}
            />
            Include Classic Literature
          </CheckboxItem>
          <CheckboxItem>
            <input
              type="checkbox"
              checked={preferences.discoverySettings?.includeDiverseAuthors || false}
              onChange={(e) => setPreferences({
                ...preferences,
                discoverySettings: {
                  ...preferences.discoverySettings!,
                  includeDiverseAuthors: e.target.checked
                }
              })}
            />
            Prioritize Diverse Authors
          </CheckboxItem>
          <CheckboxItem>
            <input
              type="checkbox"
              checked={preferences.discoverySettings?.experimentWithGenres || false}
              onChange={(e) => setPreferences({
                ...preferences,
                discoverySettings: {
                  ...preferences.discoverySettings!,
                  experimentWithGenres: e.target.checked
                }
              })}
            />
            Try New Genres
          </CheckboxItem>
        </CheckboxGroup>
      </FormGroup>

      <FormGrid style={{ marginTop: '1.5rem' }}>
        <FormGroup>
          <Label>Reading Goals (optional)</Label>
          <Input
            type="number"
            min="1"
            max="50"
            placeholder="Books per month"
            value={preferences.readingGoals?.booksPerMonth || ''}
            onChange={(e) => setPreferences({
              ...preferences,
              readingGoals: {
                ...preferences.readingGoals!,
                booksPerMonth: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
          />
        </FormGroup>

        <FormGroup>
          <Label>Preferred Book Length</Label>
          <Select
            value={preferences.readingGoals?.preferredLength || 'any'}
            onChange={(e) => setPreferences({
              ...preferences,
              readingGoals: {
                ...preferences.readingGoals!,
                preferredLength: e.target.value
              }
            })}
          >
            <option value="short">Short (under 250 pages)</option>
            <option value="medium">Medium (250-400 pages)</option>
            <option value="long">Long (400+ pages)</option>
            <option value="any">Any Length</option>
          </Select>
        </FormGroup>
      </FormGrid>
    </FormContainer>
  );

  if (showQuickSetup) {
    return (
      <Container>
        <Button variant="secondary" onClick={() => navigate('/')}>
          ← Back to Home
        </Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        {renderQuickSetup()}
      </Container>
    );
  }

  return (
    <Container>
      <Button variant="secondary" onClick={() => navigate('/')}>
        ← Back to Home
      </Button>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <Header>
        <Title>📖 Reading Preferences</Title>
        <Subtitle>Customize your book recommendations</Subtitle>
        
        <StepsContainer>
          <Step active={currentStep === 1} completed={currentStep > 1}>1</Step>
          <Step active={currentStep === 2} completed={currentStep > 2}>2</Step>
          <Step active={currentStep === 3} completed={currentStep > 3}>3</Step>
        </StepsContainer>
      </Header>

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      <ButtonRow>
        {currentStep > 1 && (
          <Button 
            variant="secondary" 
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            ← Previous
          </Button>
        )}
        
        {currentStep < 3 ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)}>
            Next →
          </Button>
        ) : (
          <Button onClick={handleSavePreferences} disabled={isLoading}>
            {isLoading ? 'Saving...' : '💾 Save Preferences'}
          </Button>
        )}
      </ButtonRow>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button
          onClick={() => navigate('/scanner')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#667eea',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          Skip preferences and start scanning
        </button>
      </div>
    </Container>
  );
};

export default PreferencesPage;