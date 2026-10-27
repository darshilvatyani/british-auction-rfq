import { BrowserRouter, Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import AuctionList from './pages/AuctionList.jsx';
import CreateRfq from './pages/CreateRfq.jsx';
import AuctionDetails from './pages/AuctionDetails.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="container header-content">
          <Link className="site-title" to="/rfqs">RFQ Auctions</Link>
          <nav className="site-nav" aria-label="Main navigation">
            <NavLink to="/rfqs" end>Auctions</NavLink>
            <NavLink className="button button--primary" to="/rfqs/new">Create RFQ</NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content" className="container" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to="/rfqs" replace />} />
          <Route path="/rfqs" element={<AuctionList />} />
          <Route path="/rfqs/new" element={<CreateRfq />} />
          <Route path="/rfqs/:rfqId" element={<AuctionDetails />} />
          <Route path="*" element={(
            <div className="page-heading">
              <h1>Page not found</h1>
              <p><Link to="/rfqs">Back to auctions</Link></p>
            </div>
          )} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
