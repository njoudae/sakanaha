export function propertyPath(propertyId: string) {
  return `/property/${encodeURIComponent(propertyId)}`;
}

export function cityPath(cityName: string) {
  return `/city/${encodeURIComponent(cityName)}`;
}

export function absoluteAppUrl(path: string) {
  return `${window.location.origin}${path}`;
}
