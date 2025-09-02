import React from 'react';
import styled, { keyframes } from 'styled-components';

// Loading Animations
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const shimmer = keyframes`
  0% { background-position: -468px 0; }
  100% { background-position: 468px 0; }
`;

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
`;

// Spinner Component
const SpinnerContainer = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  
  ${props => {
    const sizes = {
      small: '20px',
      medium: '32px', 
      large: '48px'
    };
    return `width: ${sizes[props.size || 'medium']}; height: ${sizes[props.size || 'medium']};`;
  }}
`;

const SpinnerElement = styled.div<{ size?: 'small' | 'medium' | 'large'; color?: string }>`
  border: 3px solid rgba(102, 126, 234, 0.1);
  border-top: 3px solid ${props => props.color || 'var(--primary)'};
  border-radius: 50%;
  width: 100%;
  height: 100%;
  animation: ${spin} 1s linear infinite;
`;

export const Spinner: React.FC<{
  size?: 'small' | 'medium' | 'large';
  color?: string;
}> = ({ size = 'medium', color }) => (
  <SpinnerContainer size={size}>
    <SpinnerElement size={size} color={color} />
  </SpinnerContainer>
);

// Dots Loading Component
const DotsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const Dot = styled.div<{ delay: number; color?: string }>`
  width: 8px;
  height: 8px;
  background: ${props => props.color || 'var(--primary)'};
  border-radius: 50%;
  animation: ${bounce} 1.4s ease-in-out infinite both;
  animation-delay: ${props => props.delay}s;
`;

export const DotsLoader: React.FC<{ color?: string }> = ({ color }) => (
  <DotsContainer>
    <Dot delay={-0.32} color={color} />
    <Dot delay={-0.16} color={color} />
    <Dot delay={0} color={color} />
  </DotsContainer>
);

// Skeleton Loading Component
const SkeletonBase = styled.div`
  background: linear-gradient(90deg, 
    var(--gray-200) 25%, 
    var(--gray-100) 37%, 
    var(--gray-200) 63%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 1.4s ease-in-out infinite;
  border-radius: var(--radius-md);
`;

const SkeletonText = styled(SkeletonBase)<{ 
  width?: string; 
  height?: string; 
  lines?: number; 
}>`
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '1rem'};
  margin-bottom: 0.5rem;
  
  ${props => props.lines && props.lines > 1 && `
    &::after {
      content: '';
      display: block;
      width: ${Math.random() * 40 + 60}%;
      height: ${props.height || '1rem'};
      background: inherit;
      margin-top: 0.5rem;
      border-radius: inherit;
      animation: inherit;
    }
  `}
`;

const SkeletonAvatar = styled(SkeletonBase)<{ size?: string }>`
  width: ${props => props.size || '3rem'};
  height: ${props => props.size || '3rem'};
  border-radius: 50%;
  flex-shrink: 0;
`;

const SkeletonRectangle = styled(SkeletonBase)<{ 
  width?: string; 
  height?: string; 
}>`
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '200px'};
`;

export const Skeleton = {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Rectangle: SkeletonRectangle
};

// Book Card Skeleton
const BookSkeletonContainer = styled.div`
  background: white;
  border-radius: var(--radius-lg);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

export const BookCardSkeleton: React.FC = () => (
  <BookSkeletonContainer>
    <Skeleton.Rectangle width="80px" height="120px" />
    <div style={{ flex: 1 }}>
      <Skeleton.Text width="80%" height="1.2rem" />
      <Skeleton.Text width="60%" height="1rem" />
      <Skeleton.Text width="40%" height="0.8rem" />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <Skeleton.Rectangle width="60px" height="24px" />
        <Skeleton.Rectangle width="80px" height="24px" />
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <Skeleton.Rectangle width="100px" height="32px" />
        <Skeleton.Rectangle width="120px" height="32px" />
      </div>
    </div>
  </BookSkeletonContainer>
);

// Full Page Loading Component
const FullPageLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
  gap: 1rem;
`;

const LoadingText = styled.div`
  color: var(--gray-500);
  font-size: 1.1rem;
  font-weight: 500;
`;

const LoadingSubtext = styled.div`
  color: var(--gray-400);
  font-size: 0.9rem;
  max-width: 300px;
  line-height: 1.5;
`;

export const FullPageLoading: React.FC<{
  title?: string;
  subtitle?: string;
  icon?: string;
}> = ({ 
  title = 'Loading...', 
  subtitle = 'Please wait while we process your request',
  icon = '📚'
}) => (
  <FullPageLoadingContainer>
    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
    <Spinner size="large" />
    <LoadingText>{title}</LoadingText>
    <LoadingSubtext>{subtitle}</LoadingSubtext>
  </FullPageLoadingContainer>
);

// Inline Loading Component
const InlineLoadingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
`;

export const InlineLoading: React.FC<{
  text?: string;
  size?: 'small' | 'medium';
}> = ({ text = 'Loading...', size = 'small' }) => (
  <InlineLoadingContainer>
    <Spinner size={size} />
    <span style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
      {text}
    </span>
  </InlineLoadingContainer>
);

// Progress Bar Component
const ProgressBarContainer = styled.div<{ height?: string }>`
  width: 100%;
  height: ${props => props.height || '6px'};
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ 
  progress: number; 
  animated?: boolean;
  color?: string;
}>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${props => props.color || 'var(--primary)'};
  transition: width 0.3s ease-out;
  border-radius: inherit;
  
  ${props => props.animated && `
    position: relative;
    overflow: hidden;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4),
        transparent
      );
      animation: ${shimmer} 1.5s infinite;
    }
  `}
`;

export const ProgressBar: React.FC<{
  progress: number; // 0-100
  height?: string;
  animated?: boolean;
  color?: string;
}> = ({ progress, height, animated = true, color }) => (
  <ProgressBarContainer height={height}>
    <ProgressBarFill 
      progress={Math.max(0, Math.min(100, progress))} 
      animated={animated}
      color={color}
    />
  </ProgressBarContainer>
);

// Pulsing Container for loading states
export const PulsingContainer = styled.div`
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`;

// Loading overlay
const OverlayContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
`;

const OverlayContent = styled.div`
  background: white;
  border-radius: var(--radius-xl);
  padding: 2rem;
  max-width: 300px;
  text-align: center;
  box-shadow: var(--shadow-xl);
`;

export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  title?: string;
  subtitle?: string;
}> = ({ isVisible, title = 'Processing...', subtitle }) => {
  if (!isVisible) return null;
  
  return (
    <OverlayContainer>
      <OverlayContent>
        <Spinner size="large" />
        <div style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--gray-600)' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--gray-500)' }}>
            {subtitle}
          </div>
        )}
      </OverlayContent>
    </OverlayContainer>
  );
};

const LoadingStates = {
  Spinner,
  DotsLoader,
  Skeleton,
  BookCardSkeleton,
  FullPageLoading,
  InlineLoading,
  ProgressBar,
  PulsingContainer,
  LoadingOverlay
};

export default LoadingStates;