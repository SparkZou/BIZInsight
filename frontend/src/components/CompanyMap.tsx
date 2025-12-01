import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapLocation {
    lat: number;
    lng: number;
    label: string;
    address: string;
    type: string;
}

interface CompanyMapProps {
    locations: MapLocation[];
}

export default function CompanyMap({ locations }: CompanyMapProps) {
    // Default to Auckland if no locations
    const defaultPosition: [number, number] = [-36.8485, 174.7633];
    const center = locations.length > 0 ? [locations[0].lat, locations[0].lng] as [number, number] : defaultPosition;

    return (
        <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 relative z-0">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locations.map((loc, idx) => (
                    <Marker key={idx} position={[loc.lat, loc.lng]}>
                        <Popup>
                            <div className="text-sm">
                                <strong className="block mb-1 text-neon-blue">{loc.type}</strong>
                                <strong>{loc.label}</strong>
                                <br />
                                {loc.address}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
