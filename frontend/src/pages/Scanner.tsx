import React, { useRef, useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { apiService, Book } from '../services/api';
import Button from '../components/UI/Button';
import { FullPageLoading, LoadingOverlay } from '../components/UI/LoadingStates';
import { CameraError, UploadError, AnalysisError, NoBooksFoundError } from '../components/UI/ErrorStates';
import { analytics, useAnalytics } from '../services/analytics';

const Container = styled.div`
  padding: 1rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #2d3748;
  text-align: center;
`;

const CameraContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f7fafc;
  border-radius: 12px;
  margin: 1rem 0;
  min-height: 400px;
`;

const Video = styled.video`
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  background: #000;
`;

const Canvas = styled.canvas`
  display: none;
`;

const CapturedImage = styled.img`
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  margin-bottom: 1rem;
`;


const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Instructions = styled.p`
  text-align: center;
  color: #4a5568;
  margin-bottom: 1rem;
  padding: 0 1rem;
`;


const SuccessMessage = styled.div`
  background: #c6f6d5;
  color: #2d7d32;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  text-align: center;
`;

const BooksList = styled.div`
  background: #f7fafc;
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
`;

const BookItem = styled.div`
  background: white;
  border-radius: 8px;
  padding: 0.75rem;
  margin: 0.5rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BookInfo = styled.div`
  flex: 1;
`;

const BookTitle = styled.div`
  font-weight: bold;
  color: #2d3748;
  margin-bottom: 0.25rem;
`;

const BookAuthor = styled.div`
  color: #4a5568;
  font-size: 0.9rem;
`;

const ConfidenceBadge = styled.span<{ confidence: number }>`
  background: ${props => 
    props.confidence > 0.8 ? '#48bb78' : 
    props.confidence > 0.6 ? '#ed8936' : '#e53e3e'
  };
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
`;



const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedBooks, setDetectedBooks] = useState<Book[]>([]);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  
  const analyticsHook = useAnalytics();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setCameraError(false);
        analyticsHook.trackCameraUsage(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError(true);
      analyticsHook.trackCameraUsage(false, err instanceof Error ? err.name : 'UnknownError');
    }
  }, [analyticsHook]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setUploadError(false);
        analyticsHook.trackUploadUsage(file.size, file.type, true);
      };
      reader.onerror = () => {
        setUploadError(true);
        analyticsHook.trackUploadUsage(file.size, file.type, false);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    const startTime = Date.now();
    setIsProcessing(true);
    setError(null);
    
    try {
      let session = await apiService.getSession();
      if (!session) {
        session = await apiService.createSession('mobile-scanner');
      }

      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'bookshelf.jpg', { type: 'image/jpeg' });
      
      const uploadResponse = await apiService.uploadImage(file);
      setUploadId(uploadResponse.uploadId);
      
      const analysisResponse = await apiService.analyzeImage(uploadResponse.uploadId);
      const processingTime = Date.now() - startTime;
      
      if (analysisResponse.success && analysisResponse.books.length > 0) {
        setDetectedBooks(analysisResponse.books);
        setAnalysisComplete(true);
        
        const avgConfidence = analysisResponse.books.reduce((sum, book) => sum + book.confidence, 0) / analysisResponse.books.length;
        analyticsHook.trackBookshelfScan({
          imageSize: blob.size,
          processingTime,
          booksDetected: analysisResponse.books.length,
          confidence: avgConfidence
        });
      } else {
        setError('No books detected in the image. Please try a clearer photo with visible book spines.');
        analyticsHook.trackBookshelfScan({
          imageSize: blob.size,
          processingTime,
          booksDetected: 0
        });
      }
      
    } catch (error: any) {
      console.error('Error processing image:', error);
      setError(error.response?.data?.error || 'Failed to process image. Please try again.');
      analyticsHook.trackError('image_processing_failed', { error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setDetectedBooks([]);
    setUploadId(null);
    setError(null);
    setAnalysisComplete(false);
    startCamera();
  };

  const proceedToRecommendations = () => {
    if (uploadId && detectedBooks.length > 0) {
      navigate('/recommendations', { 
        state: { 
          uploadId, 
          detectedBooks,
          capturedImage 
        } 
      });
    }
  };

  // Auto-focus improvements for mobile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isStreaming) {
        stopCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStreaming, stopCamera]);

  return (
    <Container>
      <Button variant="secondary" onClick={() => navigate('/')}>
        ← Back to Home
      </Button>
      
      <Title>📷 Scan Bookshelf</Title>
      
      <Instructions>
        Take a clear photo of a bookshelf with visible book spines, 
        or upload an existing photo from your device.
      </Instructions>

      {/* Error Handling */}
      {cameraError && (
        <CameraError
          onTryUpload={() => fileInputRef.current?.click()}
          onRetryCamera={() => {
            setCameraError(false);
            startCamera();
          }}
        />
      )}
      
      {uploadError && (
        <UploadError
          onRetry={() => fileInputRef.current?.click()}
          onChooseAnother={() => {
            setUploadError(false);
            fileInputRef.current?.click();
          }}
        />
      )}
      
      {error && !cameraError && !uploadError && (
        detectedBooks.length === 0 && analysisComplete ? (
          <NoBooksFoundError
            onRetakePhoto={retakePhoto}
            onViewTips={() => {
              // Could navigate to tips page or show modal
            }}
          />
        ) : (
          <AnalysisError
            onRetry={processImage}
            onTryDifferentPhoto={retakePhoto}
          />
        )
      )}
      
      {analysisComplete && detectedBooks.length > 0 && (
        <SuccessMessage>
          🎉 Found {detectedBooks.length} books! Ready for recommendations.
        </SuccessMessage>
      )}

      <CameraContainer>
        {capturedImage ? (
          <CapturedImage src={capturedImage} alt="Captured bookshelf" />
        ) : isStreaming ? (
          <Video
            ref={videoRef}
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#718096' }}>
            <p>📚</p>
            <p>Camera not started</p>
          </div>
        )}
        
        <Canvas ref={canvasRef} />
      </CameraContainer>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isProcessing}
        title="🔍 Analyzing your bookshelf..."
        subtitle="Using AI to detect book spines and extract titles"
      />

      {detectedBooks.length > 0 && (
        <BooksList>
          <h3 style={{ margin: '0 0 1rem 0', color: '#2d3748' }}>
            📚 Detected Books ({detectedBooks.length})
          </h3>
          {detectedBooks.map((book, index) => (
            <BookItem key={index}>
              <BookInfo>
                <BookTitle>{book.title}</BookTitle>
                <BookAuthor>by {book.author}</BookAuthor>
                {book.genre && (
                  <div style={{ color: '#667eea', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {book.genre}
                  </div>
                )}
              </BookInfo>
              <ConfidenceBadge confidence={book.confidence}>
                {Math.round(book.confidence * 100)}%
              </ConfidenceBadge>
            </BookItem>
          ))}
        </BooksList>
      )}

      <ButtonRow>
        {capturedImage ? (
          <>
            {analysisComplete && detectedBooks.length > 0 ? (
              <>
                <Button onClick={proceedToRecommendations}>
                  🎯 Get Recommendations
                </Button>
                <Button variant="secondary" onClick={retakePhoto}>
                  📷 Retake Photo
                </Button>
              </>
            ) : (
              <>
                <Button onClick={processImage} disabled={isProcessing}>
                  {isProcessing ? 'Analyzing...' : '🔍 Analyze Books'}
                </Button>
                <Button variant="secondary" onClick={retakePhoto}>
                  📷 Retake Photo
                </Button>
              </>
            )}
          </>
        ) : isStreaming ? (
          <>
            <Button onClick={capturePhoto}>
              📸 Capture Photo
            </Button>
            <Button variant="secondary" onClick={stopCamera}>
              ⏹️ Stop Camera
            </Button>
          </>
        ) : (
          <>
            <Button onClick={startCamera}>
              📷 Start Camera
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              📁 Upload Photo
            </Button>
          </>
        )}
      </ButtonRow>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </Container>
  );
};

export default Scanner;