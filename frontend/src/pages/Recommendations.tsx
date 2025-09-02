import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService, Recommendation, Book, RecommendationResponse } from '../services/api';
import Button from '../components/UI/Button';
import { FullPageLoading, BookCardSkeleton } from '../components/UI/LoadingStates';
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
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #2d3748;
  text-align: center;
`;

const Subtitle = styled.p`
  color: #4a5568;
  text-align: center;
  margin-bottom: 1rem;
`;

const ReadingProfile = styled.div`
  background: #edf2f7;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const ProfileStat = styled.div`
  text-align: center;
  background: white;
  border-radius: 6px;
  padding: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #2d3748;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #4a5568;
  margin-top: 0.25rem;
`;

const RecommendationsList = styled.div`
  display: grid;
  gap: 1rem;
`;

const RecommendationCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
`;

const BookCover = styled.div`
  width: 80px;
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  text-align: center;
  margin-right: 1rem;
  flex-shrink: 0;
`;

const BookCoverImage = styled.img`
  width: 80px;
  height: 120px;
  border-radius: 4px;
  object-fit: cover;
  margin-right: 1rem;
  flex-shrink: 0;
`;

const BookContent = styled.div`
  display: flex;
  flex: 1;
`;

const BookInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const BookTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: bold;
  color: #2d3748;
  margin-bottom: 0.25rem;
  line-height: 1.3;
`;

const BookAuthor = styled.p`
  color: #4a5568;
  margin-bottom: 0.5rem;
  font-style: italic;
`;

const BookGenre = styled.span`
  background: #667eea;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  display: inline-block;
  margin-bottom: 0.5rem;
`;

const BookReason = styled.p`
  color: #4a5568;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
`;

const BookMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
`;

const RatingBadge = styled.div`
  display: flex;
  align-items: center;
  background: #48bb78;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
`;

const ReviewsBadge = styled.div`
  background: #4a5568;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
`;

const AwardsBadge = styled.div`
  background: #ed8936;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
`;


const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #4a5568;
`;

const LoadingSpinner = styled.div`
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  text-align: center;
`;

const BackButton = styled(Button)`
  margin-bottom: 1rem;
  align-self: flex-start;
`;

interface LocationState {
  uploadId: string;
  detectedBooks: Book[];
  capturedImage?: string;
}

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const analyticsHook = useAnalytics();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [readingProfile, setReadingProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());
  const [explanation, setExplanation] = useState<string>('');
  
  usePageTracking('recommendations', 'Recommendations - Book Suggestions');

  useEffect(() => {
    if (!state?.uploadId || !state?.detectedBooks) {
      navigate('/scanner');
      return;
    }

    generateRecommendations();
  }, [state, navigate]); // generateRecommendations is defined inline, so it's ok to omit

  const generateRecommendations = async () => {
    const startTime = Date.now();
    
    try {
      setIsLoading(true);
      setError(null);

      let preferences = {};
      try {
        preferences = await apiService.getPreferences();
      } catch (prefError) {
        console.log('No preferences found, using defaults');
      }

      console.log('🎯 Generating recommendations...');
      const response: RecommendationResponse = await apiService.generateRecommendations(
        state.uploadId,
        preferences,
        { maxRecommendations: 10 }
      );

      if (response.success) {
        const enrichedRecommendations = response.recommendations.map(rec => ({
          ...rec,
          amazonUrl: apiService.generateAmazonUrl(rec)
        }));

        setRecommendations(enrichedRecommendations);
        setReadingProfile(response.readingProfile);
        setExplanation(response.explanations.why);
        console.log(`✅ Generated ${enrichedRecommendations.length} recommendations`);
        
        const processingTime = Date.now() - startTime;
        analyticsHook.trackRecommendationGeneration({
          inputBooks: state.detectedBooks.length,
          outputRecommendations: enrichedRecommendations.length,
          processingTime,
          aiProvider: 'openai',
          goodreadsIntegrated: true
        });
      } else {
        setError('Failed to generate recommendations. Please try again.');
        analyticsHook.trackError('recommendation_generation_failed', { 
          inputBooks: state.detectedBooks.length 
        });
      }
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      setError(error.response?.data?.error || 'Failed to generate recommendations. Please try again.');
      
      const processingTime = Date.now() - startTime;
      analyticsHook.trackError('recommendation_generation_error', { 
        error: error.message, 
        processingTime,
        inputBooks: state.detectedBooks.length 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBook = async (recommendation: Recommendation) => {
    try {
      const mockRecommendationId = `${recommendation.title}-${recommendation.author}`.replace(/\s+/g, '-');
      
      await apiService.saveRecommendation(mockRecommendationId);
      setSavedBooks(prev => new Set(Array.from(prev).concat(mockRecommendationId)));
      
      console.log(`📚 Saved "${recommendation.title}" for later`);
      analyticsHook.trackBookInteraction('save', recommendation.title);
    } catch (error) {
      console.error('Error saving recommendation:', error);
      analyticsHook.trackError('book_save_failed', { 
        bookTitle: recommendation.title,
        error 
      });
    }
  };

  const handleAmazonClick = (recommendation: Recommendation) => {
    window.open(recommendation.amazonUrl, '_blank', 'noopener,noreferrer');
    analyticsHook.trackBookInteraction('amazon_click', recommendation.title);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>
          <LoadingSpinner />
          <div>🎯 Generating your personalized recommendations...</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#718096' }}>
            Analyzing your reading profile and finding perfect matches
          </div>
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <BackButton variant="secondary" onClick={() => navigate('/scanner')}>
          ← Back to Scanner
        </BackButton>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton variant="secondary" onClick={() => navigate('/scanner')}>
        ← Back to Scanner
      </BackButton>

      <Header>
        <Title>📚 Your Book Recommendations</Title>
        <Subtitle>
          Based on {state.detectedBooks.length} books from your bookshelf
        </Subtitle>
        
        {readingProfile && (
          <ReadingProfile>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#2d3748' }}>
              📊 Your Reading Profile
            </div>
            <ProfileGrid>
              <ProfileStat>
                <StatValue>{readingProfile.totalBooks}</StatValue>
                <StatLabel>Books Analyzed</StatLabel>
              </ProfileStat>
              <ProfileStat>
                <StatValue>{Math.round(readingProfile.diversity * 100)}%</StatValue>
                <StatLabel>Diversity</StatLabel>
              </ProfileStat>
              <ProfileStat>
                <StatValue>{readingProfile.topGenres?.length || 0}</StatValue>
                <StatLabel>Genres</StatLabel>
              </ProfileStat>
              <ProfileStat>
                <StatValue>{readingProfile.readingStyle}</StatValue>
                <StatLabel>Style</StatLabel>
              </ProfileStat>
            </ProfileGrid>
            {explanation && (
              <div style={{ fontSize: '0.9rem', color: '#4a5568', marginTop: '0.5rem' }}>
                {explanation}
              </div>
            )}
          </ReadingProfile>
        )}
      </Header>

      <RecommendationsList>
        {recommendations.map((recommendation, index) => {
          const bookKey = `${recommendation.title}-${recommendation.author}`.replace(/\s+/g, '-');
          const isSaved = savedBooks.has(bookKey);
          
          return (
            <RecommendationCard key={index}>
              <BookContent>
                {recommendation.metadata?.thumbnail ? (
                  <BookCoverImage 
                    src={recommendation.metadata.thumbnail} 
                    alt={`${recommendation.title} cover`}
                  />
                ) : (
                  <BookCover>
                    📚
                    <br />
                    Book
                  </BookCover>
                )}
                
                <BookInfo>
                  <BookTitle>{recommendation.title}</BookTitle>
                  <BookAuthor>by {recommendation.author}</BookAuthor>
                  
                  {recommendation.genre && (
                    <BookGenre>{recommendation.genre}</BookGenre>
                  )}
                  
                  <BookMeta>
                    {recommendation.goodreadsData?.rating && (
                      <RatingBadge>
                        ⭐ {recommendation.goodreadsData.rating}/5
                      </RatingBadge>
                    )}
                    {recommendation.goodreadsData?.ratingsCount && (
                      <ReviewsBadge>
                        👥 {formatNumber(recommendation.goodreadsData.ratingsCount)} reviews
                      </ReviewsBadge>
                    )}
                    {recommendation.goodreadsData?.awards && recommendation.goodreadsData.awards.length > 0 && (
                      <AwardsBadge>
                        🏆 Award Winner
                      </AwardsBadge>
                    )}
                  </BookMeta>
                  
                  <BookReason>{recommendation.reason}</BookReason>
                  
                  <ActionButtons>
                    <Button 
                      variant="save" 
                      onClick={() => handleSaveBook(recommendation)}
                      disabled={isSaved}
                    >
                      {isSaved ? '✅ Saved' : '📚 Save for Later'}
                    </Button>
                    <Button 
                      variant="amazon"
                      onClick={() => handleAmazonClick(recommendation)}
                    >
                      🛒 Buy on Amazon
                    </Button>
                  </ActionButtons>
                </BookInfo>
              </BookContent>
            </RecommendationCard>
          );
        })}
      </RecommendationsList>

      {recommendations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#4a5568' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📚</div>
          <div>No recommendations generated. Please try scanning your bookshelf again.</div>
        </div>
      )}
    </Container>
  );
};

export default Recommendations;