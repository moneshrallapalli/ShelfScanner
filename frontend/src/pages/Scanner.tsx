import React, { useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

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

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => 
    props.variant === 'secondary' 
      ? 'transparent' 
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  };
  color: ${props => props.variant === 'secondary' ? '#4a5568' : 'white'};
  border: ${props => props.variant === 'secondary' ? '2px solid #e2e8f0' : 'none'};
  padding: 1rem 2rem;
  font-size: 1rem;
  border-radius: 10px;
  cursor: pointer;
  margin: 0.5rem;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
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

const Scanner: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please check permissions or use file upload.');
    }
  }, []);

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
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    setIsProcessing(true);
    
    try {
      // This will be implemented in Day 3-4
      // For now, just simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Image processing will be implemented in Day 3! For now, this is just a placeholder.');
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

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

      <ButtonRow>
        {capturedImage ? (
          <>
            <Button onClick={processImage} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : '🔍 Analyze Books'}
            </Button>
            <Button variant="secondary" onClick={retakePhoto}>
              📷 Retake Photo
            </Button>
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