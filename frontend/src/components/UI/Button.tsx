import React from 'react';
import styled, { css } from 'styled-components';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'save' | 'amazon';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
}

const getVariantStyles = (variant: string) => {
  const variants = {
    primary: css`
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }
      
      &:active {
        transform: translateY(0);
      }
    `,
    secondary: css`
      background: white;
      color: var(--gray-600);
      border: 2px solid var(--gray-200);
      
      &:hover:not(:disabled) {
        border-color: var(--primary);
        color: var(--primary);
        transform: translateY(-1px);
      }
    `,
    success: css`
      background: var(--success);
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: #38a169;
        transform: translateY(-1px);
      }
    `,
    danger: css`
      background: var(--danger);
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: #c53030;
        transform: translateY(-1px);
      }
    `,
    warning: css`
      background: var(--warning);
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: #dd6b20;
        transform: translateY(-1px);
      }
    `,
    ghost: css`
      background: transparent;
      color: var(--primary);
      border: none;
      
      &:hover:not(:disabled) {
        background: rgba(102, 126, 234, 0.1);
      }
    `,
    save: css`
      background: var(--success);
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: #38a169;
        transform: translateY(-1px);
      }
    `,
    amazon: css`
      background: #ff9900;
      color: white;
      border: none;
      
      &:hover:not(:disabled) {
        background: #e68900;
        transform: translateY(-1px);
      }
    `
  };
  
  return variants[variant as keyof typeof variants] || variants.primary;
};

const getSizeStyles = (size: string) => {
  const sizes = {
    small: css`
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      min-height: 36px;
    `,
    medium: css`
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      min-height: 44px;
    `,
    large: css`
      padding: 1rem 2rem;
      font-size: 1.125rem;
      min-height: 52px;
    `
  };
  
  return sizes[size as keyof typeof sizes] || sizes.medium;
};

const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  outline: none;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  
  ${props => getVariantStyles(props.variant || 'primary')}
  ${props => getSizeStyles(props.size || 'medium')}
  
  ${props => props.fullWidth && css`
    width: 100%;
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
  }
  
  /* Loading state */
  ${props => props.isLoading && css`
    cursor: not-allowed;
    
    &::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      margin: auto;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    ${props.children && css`
      color: transparent;
    `}
  `}
  
  /* Mobile optimizations */
  @media (max-width: 425px) {
    ${props => props.size === 'small' && css`
      min-height: 40px;
      padding: 0.625rem 1.25rem;
    `}
    
    ${props => props.size === 'medium' && css`
      min-height: 48px;
      padding: 0.875rem 1.75rem;
    `}
    
    ${props => props.size === 'large' && css`
      min-height: 56px;
      padding: 1.125rem 2.25rem;
    `}
  }
`;

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  onClick,
  type = 'button',
  icon,
  ...props
}) => {
  const handleClick = () => {
    if (!disabled && !isLoading && onClick) {
      onClick();
    }
  };

  return (
    <StyledButton
      type={type}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isLoading={isLoading}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {!isLoading && icon && icon}
      {!isLoading && children}
    </StyledButton>
  );
};

export default Button;