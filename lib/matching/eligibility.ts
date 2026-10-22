type Profile = { gender: string | null; seeking: string | null; latitude: number | null;
  longitude: number | null; searchRadius: number };

export function profilesAreMutuallyEligible(a: Profile | null, b: Profile | null): boolean {
  if (!a || !b) return false;
  const accepts = (seeking: string | null, gender: string | null) => seeking === "everyone"
    || (seeking === "men" && gender === "male") || (seeking === "women" && gender === "female");
  if (!accepts(a.seeking, b.gender) || !accepts(b.seeking, a.gender)) return false;
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return true;
  const rad = (v: number) => v * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  const distance = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  return distance <= Math.min(a.searchRadius, b.searchRadius);
}
