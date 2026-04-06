import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, Navigation } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useToast } from "@/shared/ui/toast/ToastProvider";

const laPazPosition: [number, number] = [-16.4897, -68.1193];

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RecenterMapProps {
  position: [number, number] | null;
}

function RecenterMap({ position }: RecenterMapProps) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.flyTo(position, 15, { duration: 1.2 });
  }, [map, position]);

  return null;
}

export function MapPage() {
  const { showError, showSuccess } = useToast();
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const currentPosition = userPosition ?? laPazPosition;
  const markerLabel = useMemo(
    () => (userPosition ? "Tu ubicacion aproximada" : "Ubicacion base Minera Marte (La Paz)"),
    [userPosition]
  );

  function locateUser() {
    if (!("geolocation" in navigator)) {
      showError("Tu navegador no soporta geolocalizacion.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];

        setUserPosition(coords);
        setIsLocating(false);
        showSuccess("Ubicacion obtenida correctamente.");
      },
      (error) => {
        setIsLocating(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Permiso de ubicacion denegado. Habilitalo para ver tu posicion."
            : "No fue posible obtener tu ubicacion. Intenta de nuevo.";
        showError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000
      }
    );
  }

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title font-headline text-3xl font-extrabold">
              Mapa y Geolocalizacion
            </h1>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Visualiza ubicaciones operativas y centra el mapa en tu posicion actual.
            </p>
          </div>

          <button
            type="button"
            onClick={locateUser}
            disabled={isLocating}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLocating ? <Navigation size={15} /> : <LocateFixed size={15} />}
            {isLocating ? "Buscando ubicacion..." : "Usar mi ubicacion"}
          </button>
        </div>
      </header>

      <article className="overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-container-low)]">
        <div className="map-wrapper h-[60vh] min-h-[360px] w-full">
          <MapContainer
            center={currentPosition}
            zoom={13}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={currentPosition} icon={defaultMarkerIcon}>
              <Popup>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{markerLabel}</p>
                  <p className="text-xs text-slate-600">
                    Lat: {currentPosition[0].toFixed(5)} | Lng: {currentPosition[1].toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
            <RecenterMap position={userPosition} />
          </MapContainer>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-soft)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)] sm:px-5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-container-high)] px-2.5 py-1">
            <MapPin size={12} />
            Centro actual: {markerLabel}
          </span>
          <span>
            Coordenadas: {currentPosition[0].toFixed(5)}, {currentPosition[1].toFixed(5)}
          </span>
        </div>
      </article>
    </section>
  );
}
