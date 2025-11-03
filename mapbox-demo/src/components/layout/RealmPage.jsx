import React from 'react';
import MapSection from '../map/MapSection';
import '../../styles/layout.css';

const RealmPage = ({ realmId = 12436 }) => {
  return (
    <div className="realm-page">
      {/* Header - Mock for now */}
      <header className="realm-header">
        <h1>Guardians of Earth - Realm {realmId}</h1>
      </header>

      {/* Featured Contributions - Mock for now */}
      <section className="featured-section">
        <h2>Featured Contributions</h2>
        <div className="featured-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="featured-card">
              <div className="placeholder">Image {i}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Down Arrow */}
      <div className="down-arrow">↓</div>

      {/* MAP SECTION - This is the main component */}
      <MapSection realmId={realmId} height={600} />

      {/* Navigation Tabs - Mock for now */}
      <nav className="navigation-tabs">
        <button className="tab active">Life</button>
        <button className="tab">Impact</button>
        <button className="tab">Stories</button>
        <button className="tab">Community</button>
        <button className="tab">Play</button>
      </nav>
    </div>
  );
};

export default RealmPage;
