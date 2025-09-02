import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  /* Reset and base styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
                 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    line-height: 1.6;
    color: #2d3748;
    background: #f8fafc;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  /* Mobile-first responsive breakpoints */
  :root {
    --mobile-s: 320px;
    --mobile-m: 375px;
    --mobile-l: 425px;
    --tablet: 768px;
    --desktop: 1024px;
    
    /* Color palette */
    --primary: #667eea;
    --primary-dark: #764ba2;
    --secondary: #48bb78;
    --danger: #e53e3e;
    --warning: #ed8936;
    --info: #4299e1;
    --success: #48bb78;
    
    /* Grays */
    --gray-50: #f8fafc;
    --gray-100: #f7fafc;
    --gray-200: #e2e8f0;
    --gray-300: #cbd5e0;
    --gray-400: #a0aec0;
    --gray-500: #4a5568;
    --gray-600: #2d3748;
    --gray-700: #1a202c;
    
    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
    
    /* Border radius */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-full: 50%;
    
    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
    --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);
    --shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.2);
    
    /* Transitions */
    --transition-fast: 0.15s ease-out;
    --transition-normal: 0.2s ease-out;
    --transition-slow: 0.3s ease-out;
  }

  /* Mobile optimizations */
  @media (max-width: 425px) {
    html {
      font-size: 14px;
    }
    
    body {
      font-size: 1rem;
    }
  }

  /* Touch-friendly interactive elements */
  button, [role="button"], input[type="submit"] {
    min-height: 44px;
    min-width: 44px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
    
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  /* Input styles */
  input, textarea, select {
    font-family: inherit;
    font-size: 16px; /* Prevents zoom on iOS */
    border-radius: var(--radius-md);
    border: 2px solid var(--gray-200);
    transition: border-color var(--transition-normal);
    
    &:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    &::placeholder {
      color: var(--gray-400);
    }
  }

  /* Remove iOS input styling */
  input[type="text"],
  input[type="email"],
  input[type="number"],
  input[type="tel"],
  input[type="url"],
  input[type="search"],
  textarea,
  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-color: white;
  }

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: var(--gray-100);
    border-radius: var(--radius-full);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: var(--radius-full);
    
    &:hover {
      background: var(--gray-400);
    }
  }

  /* Loading animations */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes shimmer {
    0% { background-position: -468px 0; }
    100% { background-position: 468px 0; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  /* Utility classes */
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }

  .animate-slideUp {
    animation: slideUp 0.3s ease-out;
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  /* Safe area handling for iOS */
  @supports (padding: max(0px)) {
    .safe-area-inset-top {
      padding-top: max(1rem, env(safe-area-inset-top));
    }
    
    .safe-area-inset-bottom {
      padding-bottom: max(1rem, env(safe-area-inset-bottom));
    }
  }

  /* Focus management for accessibility */
  .focus-visible:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    :root {
      --gray-200: #000;
      --gray-300: #333;
      --gray-400: #666;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Dark mode support (future enhancement) */
  @media (prefers-color-scheme: dark) {
    :root {
      --gray-50: #1a202c;
      --gray-100: #2d3748;
      --gray-200: #4a5568;
      --gray-300: #718096;
      --gray-400: #a0aec0;
      --gray-500: #e2e8f0;
      --gray-600: #f7fafc;
      --gray-700: #ffffff;
    }
    
    body {
      background: var(--gray-50);
      color: var(--gray-600);
    }
  }

  /* Print styles */
  @media print {
    * {
      background: white !important;
      color: black !important;
      box-shadow: none !important;
    }
    
    button, .no-print {
      display: none !important;
    }
  }
`;

export default GlobalStyles;