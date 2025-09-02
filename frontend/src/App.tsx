import React from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GlobalStyles from './styles/GlobalStyles';
import { ErrorBoundary } from './components/UI/ErrorStates';
import Home from './pages/Home';
import Preferences from './pages/Preferences';
import Scanner from './pages/Scanner';
import Recommendations from './pages/Recommendations';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  
  /* Mobile-first responsive design */
  max-width: 100vw;
  overflow-x: hidden;
`;

const AppContent = styled.div`
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: white;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
`;

function App() {
  return (
    <>
      <GlobalStyles />
      <ErrorBoundary>
        <AppContainer>
          <AppContent>
            <Router>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/preferences" element={<Preferences />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/recommendations" element={<Recommendations />} />
              </Routes>
            </Router>
          </AppContent>
        </AppContainer>
      </ErrorBoundary>
    </>
  );
}

export default App;