import React from 'react';
import styled from 'styled-components';
import Button from './Button';

// Base Error Container
const ErrorContainer = styled.div<{ variant?: 'inline' | 'card' | 'fullpage' }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius-lg);
  
  ${props => {
    switch (props.variant) {
      case 'inline':
        return `
          background: #fed7d7;
          border: 1px solid #feb2b2;
          color: #c53030;
        `;
      case 'fullpage':
        return `
          flex-direction: column;
          text-align: center;
          min-height: 50vh;
          justify-content: center;
          background: transparent;
          color: var(--gray-600);
        `;
      default:
        return `
          background: white;
          border: 2px solid #feb2b2;
          box-shadow: var(--shadow-sm);
        `;
    }
  }}
`;

const ErrorIcon = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  font-size: ${props => {
    const sizes = { small: '1.5rem', medium: '2rem', large: '3rem' };
    return sizes[props.size || 'medium'];
  }};
  flex-shrink: 0;
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.h3<{ size?: 'small' | 'medium' | 'large' }>`
  margin: 0 0 0.5rem 0;
  color: #c53030;
  font-size: ${props => {
    const sizes = { small: '1rem', medium: '1.2rem', large: '1.5rem' };
    return sizes[props.size || 'medium'];
  }};
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  margin: 0 0 1rem 0;
  color: var(--gray-600);
  line-height: 1.5;
  font-size: 0.95rem;
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`;

// Generic Error Component
interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: string;
  variant?: 'inline' | 'card' | 'fullpage';
  size?: 'small' | 'medium' | 'large';
  onRetry?: () => void;
  onDismiss?: () => void;
  children?: React.ReactNode;
  retryText?: string;
  dismissText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  icon = '❌',
  variant = 'card',
  size = 'medium',
  onRetry,
  onDismiss,
  children,
  retryText = 'Try Again',
  dismissText = 'Dismiss'
}) => (
  <ErrorContainer variant={variant}>
    <ErrorIcon size={size}>{icon}</ErrorIcon>
    <ErrorContent>
      <ErrorTitle size={size}>{title}</ErrorTitle>
      <ErrorMessage>{message}</ErrorMessage>
      {children}
      <ErrorActions>
        {onRetry && (
          <Button variant="danger" size="small" onClick={onRetry}>
            {retryText}
          </Button>
        )}
        {onDismiss && (
          <Button variant="secondary" size="small" onClick={onDismiss}>
            {dismissText}
          </Button>
        )}
      </ErrorActions>
    </ErrorContent>
  </ErrorContainer>
);

// Specific Error Types
export const NetworkError: React.FC<{
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'fullpage';
}> = ({ onRetry, variant = 'card' }) => (
  <ErrorState
    title="Connection Problem"
    message="Unable to connect to our servers. Please check your internet connection and try again."
    icon="🌐"
    variant={variant}
    onRetry={onRetry}
    retryText="Retry Connection"
  />
);

export const NotFoundError: React.FC<{
  resourceName?: string;
  onGoBack?: () => void;
  variant?: 'inline' | 'card' | 'fullpage';
}> = ({ resourceName = 'page', onGoBack, variant = 'fullpage' }) => (
  <ErrorState
    title={`${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} Not Found`}
    message={`The ${resourceName} you're looking for doesn't exist or has been moved.`}
    icon="🔍"
    variant={variant}
    onRetry={onGoBack}
    retryText="Go Back"
  />
);

export const PermissionError: React.FC<{
  action?: string;
  onLogin?: () => void;
  variant?: 'inline' | 'card' | 'fullpage';
}> = ({ action = 'access this content', onLogin, variant = 'card' }) => (
  <ErrorState
    title="Access Denied"
    message={`You don't have permission to ${action}. Please sign in or contact support.`}
    icon="🚫"
    variant={variant}
    onRetry={onLogin}
    retryText="Sign In"
  />
);

export const ValidationError: React.FC<{
  errors?: string[];
  onDismiss?: () => void;
}> = ({ errors = [], onDismiss }) => (
  <ErrorState
    title="Validation Error"
    message="Please fix the following errors:"
    icon="⚠️"
    variant="inline"
    onDismiss={onDismiss}
  >
    {errors.length > 0 && (
      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', color: 'var(--gray-600)' }}>
        {errors.map((error, index) => (
          <li key={index} style={{ marginBottom: '0.25rem' }}>{error}</li>
        ))}
      </ul>
    )}
  </ErrorState>
);

// Camera/Upload specific errors
export const CameraError: React.FC<{
  onTryUpload?: () => void;
  onRetryCamera?: () => void;
}> = ({ onTryUpload, onRetryCamera }) => (
  <ErrorState
    title="Camera Access Denied"
    message="Unable to access your camera. You can still upload a photo from your device."
    icon="📷"
    variant="card"
  >
    <ErrorActions>
      {onTryUpload && (
        <Button variant="primary" size="small" onClick={onTryUpload}>
          📁 Upload Photo Instead
        </Button>
      )}
      {onRetryCamera && (
        <Button variant="secondary" size="small" onClick={onRetryCamera}>
          🔄 Try Camera Again
        </Button>
      )}
    </ErrorActions>
  </ErrorState>
);

export const UploadError: React.FC<{
  fileName?: string;
  onRetry?: () => void;
  onChooseAnother?: () => void;
}> = ({ fileName, onRetry, onChooseAnother }) => (
  <ErrorState
    title="Upload Failed"
    message={`Failed to upload ${fileName || 'your file'}. Please check your internet connection and try again.`}
    icon="📤"
    variant="card"
    onRetry={onRetry}
    retryText="Retry Upload"
  >
    <ErrorActions>
      {onChooseAnother && (
        <Button variant="secondary" size="small" onClick={onChooseAnother}>
          Choose Another File
        </Button>
      )}
    </ErrorActions>
  </ErrorState>
);

export const AnalysisError: React.FC<{
  onRetry?: () => void;
  onTryDifferentPhoto?: () => void;
}> = ({ onRetry, onTryDifferentPhoto }) => (
  <ErrorState
    title="Analysis Failed"
    message="We couldn't analyze your bookshelf image. Make sure the photo shows book spines clearly and try again."
    icon="🔍"
    variant="card"
    onRetry={onRetry}
    retryText="Retry Analysis"
  >
    <ErrorActions>
      {onTryDifferentPhoto && (
        <Button variant="secondary" size="small" onClick={onTryDifferentPhoto}>
          Try Different Photo
        </Button>
      )}
    </ErrorActions>
  </ErrorState>
);

export const NoBooksFoundError: React.FC<{
  onRetakePhoto?: () => void;
  onViewTips?: () => void;
}> = ({ onRetakePhoto, onViewTips }) => (
  <ErrorState
    title="No Books Detected"
    message="We couldn't find any book spines in your photo. Try taking a clearer photo with better lighting."
    icon="📚"
    variant="card"
  >
    <ErrorActions>
      {onRetakePhoto && (
        <Button variant="primary" size="small" onClick={onRetakePhoto}>
          📷 Retake Photo
        </Button>
      )}
      {onViewTips && (
        <Button variant="ghost" size="small" onClick={onViewTips}>
          💡 Photo Tips
        </Button>
      )}
    </ErrorActions>
  </ErrorState>
);

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error?: Error; onReset?: () => void }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Here you could send error to analytics service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return <Fallback error={this.state.error} onReset={this.handleReset} />;
      }

      return (
        <ErrorState
          title="Application Error"
          message="Something went wrong with the application. Please refresh the page or try again later."
          icon="💥"
          variant="fullpage"
          onRetry={this.handleReset}
          retryText="Try Again"
        />
      );
    }

    return this.props.children;
  }
}

// Toast/Notification Error
const ToastContainer = styled.div<{ type: 'error' | 'warning' | 'success' | 'info' }>`
  position: fixed;
  top: 1rem;
  right: 1rem;
  max-width: 400px;
  padding: 1rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: slideIn 0.3s ease-out;
  
  ${props => {
    const styles = {
      error: 'background: #fed7d7; border-left: 4px solid #e53e3e; color: #c53030;',
      warning: 'background: #feebc8; border-left: 4px solid #ed8936; color: #c05621;',
      success: 'background: #c6f6d5; border-left: 4px solid #48bb78; color: #276749;',
      info: 'background: #bee3f8; border-left: 4px solid #4299e1; color: #2c5282;'
    };
    return styles[props.type];
  }}
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  /* Mobile responsive */
  @media (max-width: 425px) {
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
`;

const ToastClose = styled.button`
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
  }
`;

export const Toast: React.FC<{
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}> = ({ type, message, onClose, autoClose = true, duration = 5000 }) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, duration]);

  const icons = {
    error: '❌',
    warning: '⚠️',
    success: '✅',
    info: 'ℹ️'
  };

  return (
    <ToastContainer type={type}>
      <span>{icons[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <ToastClose onClick={onClose}>
          ✕
        </ToastClose>
      )}
    </ToastContainer>
  );
};

const ErrorStates = {
  ErrorState,
  NetworkError,
  NotFoundError,
  PermissionError,
  ValidationError,
  CameraError,
  UploadError,
  AnalysisError,
  NoBooksFoundError,
  ErrorBoundary,
  Toast
};

export default ErrorStates;