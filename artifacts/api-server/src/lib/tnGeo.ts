// Coordinate lookup for Tamil Nadu cities/towns used in route definitions and
// stop names. Keys are lowercase, trimmed. Used to build route geometry and to
// derive geofence / route-deviation alerts from live bus positions.
export type LatLng = { lat: number; lng: number };

const COORDS: Record<string, LatLng> = {
  chennai: { lat: 13.0827, lng: 80.2707 },
  koyambedu: { lat: 13.0694, lng: 80.1948 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  trichy: { lat: 10.7905, lng: 78.7047 },
  tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  "trichy bus stand": { lat: 10.8155, lng: 78.6963 },
  salem: { lat: 11.6643, lng: 78.146 },
  tirunelveli: { lat: 8.7139, lng: 77.7567 },
  tiruppur: { lat: 11.1085, lng: 77.3411 },
  erode: { lat: 11.341, lng: 77.7172 },
  vellore: { lat: 12.9165, lng: 79.1325 },
  thoothukudi: { lat: 8.7642, lng: 78.1348 },
  dindigul: { lat: 10.3624, lng: 77.9695 },
  thanjavur: { lat: 10.787, lng: 79.1378 },
  ranipet: { lat: 12.9249, lng: 79.3308 },
  karur: { lat: 10.9601, lng: 78.0766 },
  hosur: { lat: 12.7409, lng: 77.8253 },
  nagercoil: { lat: 8.1833, lng: 77.4119 },
  kanchipuram: { lat: 12.8342, lng: 79.7036 },
  cuddalore: { lat: 11.748, lng: 79.7714 },
  kumbakonam: { lat: 10.9602, lng: 79.3845 },
  tiruvannamalai: { lat: 12.2253, lng: 79.0747 },
  pollachi: { lat: 10.6588, lng: 77.0086 },
  pudukkottai: { lat: 10.3813, lng: 78.8214 },
  nagapattinam: { lat: 10.7656, lng: 79.8424 },
  viluppuram: { lat: 11.9401, lng: 79.4861 },
  villupuram: { lat: 11.9401, lng: 79.4861 },
  tindivanam: { lat: 12.2353, lng: 79.6535 },
  virudhunagar: { lat: 9.568, lng: 77.9624 },
  krishnagiri: { lat: 12.5186, lng: 78.2137 },
  perambalur: { lat: 11.2342, lng: 78.8807 },
  arakkonam: { lat: 13.0843, lng: 79.6707 },
  ooty: { lat: 11.4064, lng: 76.6932 },
  udhagamandalam: { lat: 11.4064, lng: 76.6932 },
  mettupalayam: { lat: 11.2999, lng: 76.9385 },
  kovilpatti: { lat: 9.1716, lng: 77.8676 },
  chidambaram: { lat: 11.3994, lng: 79.6936 },
  pondicherry: { lat: 11.9416, lng: 79.8083 },
  puducherry: { lat: 11.9416, lng: 79.8083 },
  karaikkudi: { lat: 10.0735, lng: 78.7806 },
  rajapalayam: { lat: 9.4533, lng: 77.5536 },
  sivakasi: { lat: 9.4533, lng: 77.7973 },
  namakkal: { lat: 11.2189, lng: 78.1674 },
  ariyalur: { lat: 11.1401, lng: 79.0782 },
  theni: { lat: 10.0104, lng: 77.4768 },
  ramanathapuram: { lat: 9.3639, lng: 78.8395 },
};

export function cityCoord(name: string | null | undefined): LatLng | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return COORDS[key] ?? null;
}
