import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useState, useEffect } from 'react';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';

const origin = L.latLng(19.381014715828552, -99.49333787546325);

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function LocationSelector({ onSelect }: { onSelect: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

function App() {
  const [destination, setDestination] = useState<L.LatLng | null>(null);
  const [destinationName, setDestinationName] = useState(''); // 🆕 Nuevo estado
  const [dieselPerKm, setDieselPerKm] = useState(0);
  const [pricePerLiter, setPricePerLiter] = useState(0);
  const [numTrips, setNumTrips] = useState(1);
  const [routeCoords, setRouteCoords] = useState<L.LatLng[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);

  useEffect(() => {
    async function fetchRoute() {
      if (!destination) {
        setRouteCoords([]);
        setDistanceKm(0);
        return;
      }

      try {
        const apiKey = '5b3ce3597851110001cf62483d8976ada1484179b76a8ae7ae020263';
        const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

        const response = await axios.post(
          url,
          {
            coordinates: [
              [origin.lng, origin.lat],
              [destination.lng, destination.lat],
            ],
          },
          {
            headers: {
              Authorization: apiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        const coordsLngLat = response.data.features[0].geometry.coordinates;
        const coordsLatLng = coordsLngLat.map((c: number[]) => L.latLng(c[1], c[0]));
        setRouteCoords(coordsLatLng);

        const distanceMeters = response.data.features[0].properties.summary.distance;
        setDistanceKm(distanceMeters / 1000);
      } catch (error) {
        console.error('Error fetching route:', error);
        setRouteCoords([]);
        setDistanceKm(0);
      }
    }

    fetchRoute();
  }, [destination]);

  // 🆕 Obtener nombre del lugar cuando cambia el destino
  useEffect(() => {
    async function fetchPlaceName() {
      if (!destination) {
        setDestinationName('');
        return;
      }

      try {
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            format: 'json',
            lat: destination.lat,
            lon: destination.lng,
          },
        });

        setDestinationName(response.data.display_name || '');
      } catch (error) {
        console.error('Error fetching place name:', error);
        setDestinationName('');
      }
    }

    fetchPlaceName();
  }, [destination]);

  const roundTripDistance = distanceKm * 2;
  const dieselPerRoundTrip = roundTripDistance * dieselPerKm;
  const totalDieselUsed = dieselPerRoundTrip * numTrips;
  const totalCost = totalDieselUsed * pricePerLiter;

  return (
    <div className="app">
      <img src={require('../src/assets/diesel.png')} alt="Diesel Logo" />

      <div className="map">
        <MapContainer
          className="map-container"
          center={origin}
          zoom={6}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          zoomControl={true}
          dragging={true}
          touchZoom={false}
          boxZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={origin} icon={markerIcon} />
          {destination && <Marker position={destination} icon={markerIcon} />}
          {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" />}
          <LocationSelector onSelect={setDestination} />
        </MapContainer>
      </div>

      <div className="inputs">
        <label>
          Diésel por km:
          <input
            type="number"
            step="0.01"
            value={dieselPerKm}
            onChange={(e) => setDieselPerKm(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Precio por litro:
          <input
            type="number"
            step="0.01"
            value={pricePerLiter}
            onChange={(e) => setPricePerLiter(parseFloat(e.target.value))}
          />
        </label>

        <label>
          Número de viajes (ida y vuelta):
          <input
            type="number"
            min="1"
            value={numTrips}
            onChange={(e) => setNumTrips(parseInt(e.target.value))}
          />
        </label>

        {destination && (
          <>
            <div className="results-section">
              <h3>🛣️ Resultados por viaje (ida y vuelta)</h3>
              <div className="result">
                <strong>Distancia:</strong> {roundTripDistance.toFixed(2)} km
              </div>
              <div className="result">
                <strong>Diésel usado:</strong> {(roundTripDistance * dieselPerKm).toFixed(2)} L
              </div>
              <div className="result">
                <strong>Costo:</strong> ${(roundTripDistance * dieselPerKm * pricePerLiter).toFixed(2)} MXN
              </div>
            </div>

            <div className="results-section">
              <h3>🔁 Resultados totales ({numTrips} viajes)</h3>
              <div className="result">
                <strong>Diésel total:</strong> {totalDieselUsed.toFixed(2)} L
              </div>
              <div className="result">
                <strong>Costo total:</strong> ${totalCost.toFixed(2)} MXN
              </div>
            </div>

            <div className="coords">
              <strong>Destino:</strong> {destinationName || `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
