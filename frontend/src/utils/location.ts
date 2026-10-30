import type { LatLng } from "../api/types"

/** Asks the browser for the traveler's current position. */
export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Location is not supported by this browser"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) =>
        reject(new Error(error.code === error.PERMISSION_DENIED ? "Location permission was denied" : "Could not get your location")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}

export const formatLatLng = ({ lat, lng }: LatLng) => `${lat.toFixed(5)},${lng.toFixed(5)}`
