'use client';

import { useState, useEffect } from 'react';

interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    precipitation: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
    windGusts: number;
  };
  daily: {
    date: string;
    weatherCode: number;
    tempMax: number;
    tempMin: number;
    precipitationSum: number;
    precipitationProb: number;
    windSpeedMax: number;
    windGustsMax: number;
    windDirection: number;
    sunrise: string;
    sunset: string;
  }[];
}

function WeatherIcon({ code, className = '' }: { code: number; className?: string }) {
  // Clear/Sunny
  if (code === 0) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>;
  // Partly cloudy
  if (code === 1 || code === 2) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="10" cy="8" r="3" stroke="#f59e0b"/><path d="M18 14a4 4 0 0 0-4-4 4 4 0 0 0-3.9 3H7a3 3 0 0 0 0 6h11a3 3 0 0 0 0-6z"/></svg>;
  // Overcast
  if (code === 3) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M18 10a4 4 0 0 0-4-4 4 4 0 0 0-3.9 3H6a3 3 0 0 0 0 6h12a3 3 0 0 0 0-6z"/></svg>;
  // Fog
  if (code === 45 || code === 48) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M4 10h16M4 14h16M4 18h16M8 6h8"/></svg>;
  // Drizzle/light rain
  if (code >= 51 && code <= 55) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M18 10a4 4 0 0 0-4-4 4 4 0 0 0-3.9 3H6a3 3 0 0 0 0 6h12a3 3 0 0 0 0-6z"/><path d="M8 19v2M12 17v2M16 19v2"/></svg>;
  // Rain
  if (code >= 61 && code <= 67) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M18 10a4 4 0 0 0-4-4 4 4 0 0 0-3.9 3H6a3 3 0 0 0 0 6h12a3 3 0 0 0 0-6z"/><path d="M8 19v2M12 17v2M16 19v2M9 21v1M15 21v1"/></svg>;
  // Showers
  if (code >= 80 && code <= 82) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M18 10a4 4 0 0 0-4-4 4 4 0 0 0-3.9 3H6a3 3 0 0 0 0 6h12a3 3 0 0 0 0-6z"/><path d="M8 19v2M12 17v2M16 19v2"/></svg>;
  // Thunderstorm
  if (code >= 95) return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M18 10a4 4 0 0 0-4-4 4 4 0 0 0-3.9 3H6a3 3 0 0 0 0 6h12a3 3 0 0 0 0-6z"/><path d="M13 16l-2 4h4l-2 4"/></svg>;
  // Default
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="4"/></svg>;
}

const WMO_LABELS: Record<number, string> = {
  0: 'Cerah', 1: 'Sebagian Cerah', 2: 'Berawan', 3: 'Mendung',
  45: 'Kabut', 48: 'Kabut',
  51: 'Gerimis', 53: 'Gerimis', 55: 'Hujan Ringan',
  61: 'Hujan', 63: 'Hujan', 65: 'Hujan Lebat',
  80: 'Hujan', 81: 'Hujan', 82: 'Hujan Lebat',
  95: 'Badai', 96: 'Badai', 99: 'Badai',
};

function getWindDir(deg: number): string {
  const dirs = ['U', 'UT', 'T', 'TT', 'S', 'SB', 'B', 'BB'];
  return dirs[Math.round(deg / 45) % 8];
}

function getFishingCondition(data: WeatherData): { label: string; color: string } {
  const { windSpeed, precipitation, weatherCode } = data.current;
  const isRaining = precipitation > 0 || weatherCode >= 51;
  const isWindy = windSpeed > 25;
  const isStormy = weatherCode >= 95;
  if (isStormy) return { label: 'Tidak Aman', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10' };
  if (isWindy && isRaining) return { label: 'Kurang Baik', color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10' };
  if (isRaining) return { label: 'Hati-hati', color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-500/10' };
  if (isWindy) return { label: 'Berangin', color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-500/10' };
  if (windSpeed < 10 && !isRaining) return { label: 'Sangat Baik', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10' };
  return { label: 'Baik', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Hari Ini';
  if (diff === 1) return 'Besok';
  return date.toLocaleDateString('id-ID', { weekday: 'short' });
}

interface WeatherCardProps {
  lat: number;
  lng: number;
}

export default function WeatherCard({ lat, lng }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchWeather(ctrl.signal);
    return () => ctrl.abort();
  }, [lat, lng]);

  async function fetchWeather(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch weather');
      const data = await res.json();
      setWeather(data);
    } catch (err) {
      setError('Gagal memuat cuaca');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse dark:bg-gray-800 dark:border-gray-700">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3 dark:bg-gray-700" />
        <div className="h-8 bg-gray-200 rounded w-1/2 dark:bg-gray-700" />
      </div>
    );
  }

  if (error || !weather) {
    return null; // Don't show if weather fails
  }

  const condition = getFishingCondition(weather);
  const current = weather.current;
  const daily = weather.daily;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      {/* Current Weather */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">Cuaca</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${condition.color}`}>
            Mancing: {condition.label}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Icon + Temp */}
          <div className="text-center">
            <WeatherIcon code={current.weatherCode} className="w-12 h-12" />
            <div className="text-2xl font-bold text-gray-900 mt-1 dark:text-white">
              {Math.round(current.temperature)}°
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Terasa {Math.round(current.feelsLike)}°
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>
              <span className="text-gray-700 dark:text-gray-200">{Math.round(current.windSpeed)} km/j {getWindDir(current.windDirection)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              <span className="text-gray-700 dark:text-gray-200">{current.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20M6 16l4-12 4 12M8.5 10h3"/></svg>
              <span className="text-gray-700 dark:text-gray-200">{current.precipitation > 0 ? `${current.precipitation}mm` : 'Kering'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/><path d="M2 12a15.3 15.3 0 0 0 4 10 15.3 15.3 0 0 0 4-10"/></svg>
              <span className="text-gray-700 dark:text-gray-200">Hembusan {Math.round(current.windGusts)} km/j</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle forecast */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 bg-gray-50 text-xs text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        {expanded ? 'Sembunyikan' : 'Prediksi 3 Hari'}
        <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 3-Day Forecast */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {daily.map((day, i) => (
            <div key={day.date} className={`flex items-center gap-3 px-4 py-3 ${i < daily.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <span className="text-xs font-medium text-gray-500 w-14 dark:text-gray-400">{formatDate(day.date)}</span>
              <WeatherIcon code={day.weatherCode} className="w-6 h-6" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.round(day.tempMin)}° — {Math.round(day.tempMax)}°
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {WMO_LABELS[day.weatherCode] || '-'}
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                <div>{day.precipitationProb > 0 ? `${day.precipitationProb}% hujan` : 'Kering'}</div>
                <div>{Math.round(day.windSpeedMax)} km/j</div>
              </div>
            </div>
          ))}

          {/* Sunrise / Sunset */}
          {daily[0] && (
            <div className="flex items-center justify-center gap-6 px-4 py-2 bg-gray-50 text-xs text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              <span>Terbit {new Date(daily[0].sunrise).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>Terbenam {new Date(daily[0].sunset).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
