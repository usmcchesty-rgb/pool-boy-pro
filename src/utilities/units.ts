import type { TemperatureUnit, VolumeUnit } from '../models/types';

/** Convert liters to US gallons */
export function litersToGallons(liters: number): number {
  return liters * 0.264172;
}

/** Convert US gallons to liters */
export function gallonsToLiters(gallons: number): number {
  return gallons / 0.264172;
}

/** Normalize pool volume to US gallons for chemistry calculations */
export function toGallons(volume: number, unit: VolumeUnit): number {
  return unit === 'liters' ? litersToGallons(volume) : volume;
}

/** Convert Fahrenheit to Celsius */
export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/** Convert Celsius to Fahrenheit */
export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

/** Convert temperature to Fahrenheit for internal analysis */
export function toFahrenheit(temp: number, unit: TemperatureUnit): number {
  return unit === 'celsius' ? celsiusToFahrenheit(temp) : temp;
}

export function formatVolume(volume: number, unit: VolumeUnit): string {
  return `${volume.toLocaleString()} ${unit === 'gallons' ? 'gal' : 'L'}`;
}

export function formatTemperature(temp: number, unit: TemperatureUnit): string {
  const symbol = unit === 'fahrenheit' ? '°F' : '°C';
  return `${temp.toFixed(1)}${symbol}`;
}

export function formatPpm(value: number): string {
  return `${value.toFixed(value < 10 ? 1 : 0)} ppm`;
}
