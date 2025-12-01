import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import SearchPage from './pages/SearchPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/companies/:id" element={<CompanyDetailsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
