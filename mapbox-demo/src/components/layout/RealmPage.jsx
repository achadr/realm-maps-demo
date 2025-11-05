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
      <MapSection
        realmId={realmId}
        height={600}
        polygon={{
          type: "Polygon",
          coordinates: [[
            [144.97414462677202, -37.80102882726442],
            [144.97000329605302, -37.800791461768725],
            [144.96968143097124, -37.80318203655827],
            [144.96794335952958, -37.80301249479613],
            [144.9683081399556, -37.80067277873483],
            [144.96320121399125, -37.80029977367253],
            [144.96251456848344, -37.807547397902205],
            [144.9637161981221, -37.810131613495315],
            [144.97058265320024, -37.80789384149249],
            [144.97339360824785, -37.80857196138209]
          ]]
        }}
      />

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
