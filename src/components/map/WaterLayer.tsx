'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

interface WaterFeature {
  type: 'Feature';
  geometry: Record<string, any>;
  properties: {
    name?: string;
    water?: string;
    waterway?: string;
  };
}

// Curated fallback: major water bodies in Java-Sumatra-Bali
// Used when Overpass API is slow/fails
const FALLBACK_WATER_BODIES: WaterFeature[] = [
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[107.40,-6.49],[107.45,-6.49],[107.50,-6.51],[107.52,-6.53],[107.50,-6.56],[107.45,-6.56],[107.40,-6.54],[107.39,-6.51],[107.40,-6.49]]] }, properties: { name: 'Waduk Jatiluhur', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[107.30,-6.82],[107.35,-6.82],[107.40,-6.84],[107.42,-6.87],[107.38,-6.89],[107.32,-6.88],[107.28,-6.85],[107.30,-6.82]]] }, properties: { name: 'Danau Saguling', water: 'lake' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[107.28,-6.84],[107.32,-6.83],[107.36,-6.85],[107.35,-6.89],[107.30,-6.90],[107.26,-6.87],[107.28,-6.84]]] }, properties: { name: 'Waduk Cirata', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[103.60,-4.85],[103.70,-4.85],[103.80,-4.88],[103.82,-4.92],[103.75,-4.96],[103.65,-4.94],[103.58,-4.90],[103.60,-4.85]]] }, properties: { name: 'Danau Ranau', water: 'lake' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[110.88,-7.80],[110.95,-7.79],[111.02,-7.82],[111.00,-7.88],[110.92,-7.90],[110.85,-7.86],[110.88,-7.80]]] }, properties: { name: 'Waduk Gajah Mungkur', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[109.28,-7.55],[109.33,-7.54],[109.37,-7.57],[109.35,-7.62],[109.30,-7.63],[109.26,-7.59],[109.28,-7.55]]] }, properties: { name: 'Waduk Sempor', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[109.38,-7.10],[109.44,-7.09],[109.50,-7.12],[109.48,-7.18],[109.40,-7.19],[109.35,-7.15],[109.38,-7.10]]] }, properties: { name: 'Waduk Mrica', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[110.78,-7.30],[110.85,-7.28],[110.92,-7.32],[110.90,-7.40],[110.82,-7.42],[110.75,-7.37],[110.78,-7.30]]] }, properties: { name: 'Waduk Kedungombo', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[111.21,-7.81],[111.24,-7.80],[111.26,-7.82],[111.25,-7.85],[111.22,-7.86],[111.20,-7.83],[111.21,-7.81]]] }, properties: { name: 'Telaga Sarangan', water: 'lake' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[110.36,-7.02],[110.40,-7.01],[110.43,-7.03],[110.42,-7.07],[110.38,-7.08],[110.35,-7.05],[110.36,-7.02]]] }, properties: { name: 'Waduk Jatibarang', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[96.82,4.50],[96.88,4.49],[96.94,4.51],[96.96,4.55],[96.92,4.59],[96.85,4.58],[96.81,4.54],[96.82,4.50]]] }, properties: { name: 'Danau Laut Tawar', water: 'lake' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[112.48,-8.12],[112.55,-8.10],[112.62,-8.14],[112.60,-8.22],[112.52,-8.24],[112.45,-8.18],[112.48,-8.12]]] }, properties: { name: 'Waduk Karangkates', water: 'reservoir' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[120.62,-1.70],[120.75,-1.72],[120.88,-1.78],[120.90,-1.88],[120.80,-1.95],[120.65,-1.90],[120.58,-1.80],[120.62,-1.70]]] }, properties: { name: 'Danau Poso', water: 'lake' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[109.60,-7.20],[109.65,-7.19],[109.70,-7.22],[109.68,-7.27],[109.62,-7.28],[109.58,-7.24],[109.60,-7.20]]] }, properties: { name: 'Waduk Mangu', water: 'reservoir' } },
];

// Cache key for localStorage
const CACHE_KEY = 'spotfish-water-data';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCachedData(): WaterFeature[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(data: WaterFeature[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full or unavailable
  }
}

// Fetch water bodies from Overpass API
async function fetchWaterBodies(
  south: number, west: number, north: number, east: number
): Promise<WaterFeature[]> {
  const pad = 0.05;
  const bbox = `${south - pad},${west - pad},${north + pad},${east + pad}`;

  const query = `
    [out:json][timeout:15];
    (
      way["natural"="water"]["water"~"lake|reservoir|pond|oxbow"](bbox);
      way["natural"="water"]["water"!~"."](bbox);
      relation["natural"="water"]["water"~"lake|reservoir|pond|oxbow"](bbox);
    );
    out body;
    >;
    out skel qt;
  `.trim();

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

  const data = await res.json();
  return parseOverpassResponse(data);
}

// Parse Overpass JSON into GeoJSON features
function parseOverpassResponse(data: any): WaterFeature[] {
  const nodes = new Map<number, [number, number]>();
  const ways = new Map<number, [number, number][]>();

  for (const el of data.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, [el.lon, el.lat]);
    }
  }

  for (const el of data.elements) {
    if (el.type === 'way' && el.nodes) {
      const coords = el.nodes
        .map((id: number) => nodes.get(id))
        .filter(Boolean) as [number, number][];
      if (coords.length >= 4) {
        if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
          coords.push(coords[0]);
        }
        ways.set(el.id, coords);
      }
    }
  }

  const features: WaterFeature[] = [];
  for (const el of data.elements) {
    if (el.type === 'way' && el.tags && ways.has(el.id)) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [ways.get(el.id)],
        },
        properties: {
          name: el.tags.name,
          water: el.tags.water,
          waterway: el.tags.waterway,
        },
      });
    }
  }

  return features;
}

export default function WaterLayer() {
  const map = useMap();
  const [waterBodies, setWaterBodies] = useState<WaterFeature[]>(FALLBACK_WATER_BODIES);
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    async function load() {
      const cached = getCachedData();
      if (cached && cached.length > 0) {
        setWaterBodies(cached);
        setLoaded(true);
        fetchedRef.current = true;
        return;
      }

      try {
        const bounds = map.getBounds();
        const features = await fetchWaterBodies(
          bounds.getSouth(), bounds.getWest(),
          bounds.getNorth(), bounds.getEast()
        );
        if (features.length > 0) {
          setWaterBodies(features);
          setCachedData(features);
        }
        setLoaded(true);
        fetchedRef.current = true;
      } catch (err) {
        console.warn('Overpass API failed, using fallback water data:', err);
        setLoaded(true);
        fetchedRef.current = true;
      }
    }

    const timer = setTimeout(load, 1500);
    return () => clearTimeout(timer);
  }, [map]);

  const style = useMemo(() => ({
    fillColor: '#3b82f6',
    fillOpacity: 0.15,
    color: '#2563eb',
    weight: 1.5,
    opacity: 0.4,
    className: 'water-body',
  }), []);

  const onEachFeature = useMemo(() => {
    return (feature: WaterFeature, layer: L.Layer) => {
      if (feature.properties.name) {
        layer.bindTooltip(feature.properties.name, {
          permanent: false,
          direction: 'center',
          className: 'water-tooltip',
        });
      }
    };
  }, []);

  return (
    <GeoJSON
      key={loaded ? 'water-loaded' : 'water-fallback'}
      data={{
        type: 'FeatureCollection',
        features: waterBodies,
      } as any}
      style={() => style}
      onEachFeature={onEachFeature}
      interactive={true}
      bubblingMouseEvents={true}
    />
  );
}
