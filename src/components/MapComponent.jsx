import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
// Fix for default Leaflet marker icon not showing up in Webpack/Vite projects
import L from 'leaflet';

// Fix icon issue: Use the default icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'leaflet/dist/images/marker-icon-2x.png',
  iconUrl: 'leaflet/dist/images/marker-icon.png',
  shadowUrl: 'leaflet/dist/images/marker-shadow.png',
});


const MapComponent = ({ setShowMap }) => {
  const [monuments, setMonuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set the default center to a point in Central Karnataka
  const initialCenter = [14.5000, 76.0000]; 
  const initialZoom = 6.5;

  useEffect(() => {
    const fetchMonuments = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/monuments');
        setMonuments(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch monuments:', err);
        setError('Failed to load monument data from the server.');
        setIsLoading(false);
      }
    };

    fetchMonuments();
  }, []);

  if (isLoading) {
    return <div className="p-4 text-center text-lg text-gray-500">Loading map data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-lg text-red-500">{error}</div>;
  }
  
  // Custom Map Tile (Optional: using a theme-matching tile layer)
  const mapTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-3 bg-white border-b border-orange-200">
        <h3 className="text-xl font-bold text-orange-600 flex items-center gap-2">
          <Map className="w-5 h-5"/> Heritage Map of Karnataka
        </h3>
        <button 
          onClick={() => setShowMap(false)} 
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Close Map
        </button>
      </div>
      <div className="flex-1 w-full" style={{ height: '70vh' }}>
        <MapContainer center={initialCenter} zoom={initialZoom} scrollWheelZoom={true} className="h-full w-full rounded-b-lg shadow-xl">
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url={mapTileUrl}
          />

          {monuments.map((monument) => (
            <Marker key={monument.key} position={[monument.lat, monument.lng]}>
              <Popup>
                <div className="p-2">
                  <h4 className="text-lg font-bold text-orange-600">{monument.name} {monument.icon}</h4>
                  <p className="text-sm text-gray-700">Location: {monument.location}</p>
                  <p className="mt-2 text-xs italic text-gray-500">
                    Ask CulturaBot: "Tell me about {monument.name}"
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;