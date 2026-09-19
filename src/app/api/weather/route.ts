// ============================================
// SpotFish! — Weather API (Open-Meteo, free)
// ============================================

import { NextRequest, NextResponse } from 'next/server';

interface WeatherCache {
  data: any;
  timestamp: number;
}

const cache = new Map<string, WeatherCache>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lat: number, lng: number): string {
  // Round to 2 decimal places for cache grouping (~1km)
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

// GET /api/weather?lat=X&lng=Y
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Check cache
    const cacheKey = getCacheKey(lat, lng);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Fetch from Open-Meteo — current + 3-day forecast + wind + marine params
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'wind_direction_10m_dominant',
        'sunrise',
        'sunset',
      ].join(','),
      timezone: 'Asia/Jakarta',
      forecast_days: '3',
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

    if (!res.ok) {
      throw new Error(`Open-Meteo error: ${res.status}`);
    }

    const data = await res.json();

    // Transform for easier consumption
    const result = {
      current: {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        windGusts: data.current.wind_gusts_10m,
      },
      daily: data.daily.time.map((date: string, i: number) => ({
        date,
        weatherCode: data.daily.weather_code[i],
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        precipitationSum: data.daily.precipitation_sum[i],
        precipitationProb: data.daily.precipitation_probability_max[i],
        windSpeedMax: data.daily.wind_speed_10m_max[i],
        windGustsMax: data.daily.wind_gusts_10m_max[i],
        windDirection: data.daily.wind_direction_10m_dominant[i],
        sunrise: data.daily.sunrise[i],
        sunset: data.daily.sunset[i],
      })),
    };

    // Cache
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching weather:', error);
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
}

// WMO Weather codes → description
export function getWeatherDescription(code: number): { label: string; icon: string } {
  const descriptions: Record<number, { label: string; icon: string }> = {
    0: { label: 'Cerah', icon: '☀' },
    1: { label: 'Sebagian Cerah', icon: '🌤' },
    2: { label: 'Berawan', icon: '⛅' },
    3: { label: 'Mendung', icon: '☁' },
    45: { label: 'Kabut', icon: '🌫' },
    48: { label: 'Kabut Beku', icon: '🌫' },
    51: { label: 'Gerimis Ringan', icon: '🌦' },
    53: { label: 'Gerimis', icon: '🌦' },
    55: { label: 'Gerimis Lebat', icon: '🌧' },
    56: { label: 'Gerimis Beku', icon: '🌧' },
    57: { label: 'Gerimis Beku Lebat', icon: '🌧' },
    61: { label: 'Hujan Ringan', icon: '🌧' },
    63: { label: 'Hujan', icon: '🌧' },
    65: { label: 'Hujan Lebat', icon: '🌧' },
    66: { label: 'Hujan Beku', icon: '🌧' },
    67: { label: 'Hujan Beku Lebat', icon: '🌧' },
    71: { label: 'Salju Ringan', icon: '❄' },
    73: { label: 'Salju', icon: '❄' },
    75: { label: 'Salju Lebat', icon: '❄' },
    77: { label: 'Butiran Salju', icon: '❄' },
    80: { label: 'Hujan Ringan', icon: '🌦' },
    81: { label: 'Hujan', icon: '🌧' },
    82: { label: 'Hujan Lebat', icon: '⛈' },
    85: { label: 'Salju Ringan', icon: '❄' },
    86: { label: 'Salju Lebat', icon: '❄' },
    95: { label: 'Badai Petir', icon: '⛈' },
    96: { label: 'Badai + Hail', icon: '⛈' },
    99: { label: 'Badai + Hail Lebat', icon: '⛈' },
  };
  return descriptions[code] || { label: 'Tidak diketahui', icon: '❓' };
}

// Wind direction degrees → compass
export function getWindDirection(degrees: number): string {
  const dirs = ['U', 'UT', 'T', 'TT', 'S', 'SB', 'B', 'BB'];
  return dirs[Math.round(degrees / 45) % 8];
}

// Fishing conditions assessment
export function getFishingCondition(weather: any): { label: string; color: string } {
  const { windSpeed, precipitation, weatherCode } = weather.current;
  const isRaining = precipitation > 0 || weatherCode >= 51;
  const isWindy = windSpeed > 25;
  const isStormy = weatherCode >= 95;

  if (isStormy) return { label: 'Tidak Aman', color: 'red' };
  if (isWindy && isRaining) return { label: 'Kurang Baik', color: 'orange' };
  if (isRaining) return { label: 'Hati-hati', color: 'yellow' };
  if (isWindy) return { label: 'Berangin', color: 'yellow' };
  if (windSpeed < 10 && !isRaining) return { label: 'Sangat Baik', color: 'green' };
  return { label: 'Baik', color: 'blue' };
}
