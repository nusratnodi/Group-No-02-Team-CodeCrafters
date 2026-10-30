import {
  Banknote,
  BedDouble,
  Building2,
  Bus,
  Car,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Footprints,
  Hospital,
  Hotel,
  Landmark,
  Mountain,
  Receipt,
  ShoppingBag,
  Sun,
  Trees,
  Utensils,
  Waves,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"
import type { Category, ExpenseCategory, PlaceCategory, TravelMode, WeatherIconName } from "../api/types"

const WEATHER_ICONS: Record<WeatherIconName, LucideIcon> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

export const PLACE_ICONS: Record<PlaceCategory, LucideIcon> = {
  restaurant: Utensils,
  hospital: Hospital,
  hotel: Hotel,
  shopping: ShoppingBag,
  atm: Banknote,
  other: Landmark,
}

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Beach: Waves,
  Mountain: Mountain,
  Historical: Landmark,
  City: Building2,
  Nature: Trees,
}

export const EXPENSE_ICONS: Record<ExpenseCategory, LucideIcon> = {
  Transportation: Bus,
  Accommodation: BedDouble,
  Food: Utensils,
  Shopping: ShoppingBag,
  Other: Receipt,
}

export const MODE_ICONS: Record<TravelMode, LucideIcon> = { car: Car, bus: Bus, walk: Footprints }

export function WeatherIcon({ name, ...props }: { name: WeatherIconName } & LucideProps) {
  const Icon = WEATHER_ICONS[name] ?? Cloud
  return <Icon {...props} />
}

export function PlaceIcon({ category, ...props }: { category: PlaceCategory } & LucideProps) {
  const Icon = PLACE_ICONS[category] ?? Landmark
  return <Icon {...props} />
}
