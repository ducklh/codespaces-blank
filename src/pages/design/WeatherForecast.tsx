import { useEffect, useState } from "react";

const API_URL = "https://api.open-meteo.com/v1/forecast";
const TIME_ZONE = "Asia/Bangkok";

const places = [
  { name: "Bangkok", latitude: 13.7563, longitude: 100.5018 },
  { name: "Chiang Mai", latitude: 18.7883, longitude: 98.9853 },
  { name: "Phuket", latitude: 7.8804, longitude: 98.3923 },
  { name: "Ayutthaya", latitude: 14.3532, longitude: 100.5689 },
  { name: "Pai", latitude: 19.3587, longitude: 98.4403 },
] as const;

type Place = (typeof places)[number];
type ForecastDay = {
  date: string;
  weatherCode: number;
  high: number;
  low: number;
  rainChance: number | null;
};
type ForecastState =
  | { place: Place; status: "loading" }
  | { place: Place; status: "error"; message: string }
  | { place: Place; status: "ready"; days: ForecastDay[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readForecast(value: unknown): ForecastDay[] {
  if (!isRecord(value) || !isRecord(value.daily)) {
    throw new Error("Weather service returned an invalid response.");
  }

  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max } =
    value.daily;
  if (
    !Array.isArray(time) ||
    !Array.isArray(weather_code) ||
    !Array.isArray(temperature_2m_max) ||
    !Array.isArray(temperature_2m_min) ||
    !Array.isArray(precipitation_probability_max) ||
    time.length < 3 ||
    weather_code.length < 3 ||
    temperature_2m_max.length < 3 ||
    temperature_2m_min.length < 3 ||
    precipitation_probability_max.length < 3
  ) {
    throw new Error("Weather service did not return a three-day forecast.");
  }

  return time.slice(0, 3).map((date, index) => {
    const code = weather_code[index];
    const high = temperature_2m_max[index];
    const low = temperature_2m_min[index];
    const rainChance = precipitation_probability_max[index];
    if (
      typeof date !== "string" ||
      typeof code !== "number" ||
      typeof high !== "number" ||
      typeof low !== "number" ||
      (rainChance !== null && typeof rainChance !== "number")
    ) {
      throw new Error("Weather service returned incomplete forecast data.");
    }

    return { date, weatherCode: code, high, low, rainChance };
  });
}

async function fetchForecast(place: Place, signal: AbortSignal): Promise<ForecastDay[]> {
  const url = new URL(API_URL);
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: TIME_ZONE,
    forecast_days: "3",
  }).toString();

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Weather service is unavailable (HTTP ${response.status}).`);
  }

  return readForecast(await response.json());
}

function weatherDescription(code: number) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Conditions unavailable";
}

function formatForecastDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function formatUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
    timeZoneName: "short",
  }).format(date);
}

export default function WeatherForecast() {
  const [forecasts, setForecasts] = useState<ForecastState[]>(() =>
    places.map((place) => ({ place, status: "loading" })),
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setForecasts(places.map((place) => ({ place, status: "loading" })));
    setUpdatedAt(null);

    const loadForecasts = async () => {
      const results = await Promise.all(
        places.map(async (place): Promise<ForecastState> => {
          try {
            return { place, status: "ready", days: await fetchForecast(place, controller.signal) };
          } catch (error) {
            if (controller.signal.aborted) {
              return { place, status: "loading" };
            }
            return {
              place,
              status: "error",
              message: error instanceof Error ? error.message : "Could not load this forecast.",
            };
          }
        }),
      );

      if (controller.signal.aborted) return;
      setForecasts(results);
      setUpdatedAt(new Date());
    };

    void loadForecasts();
    return () => controller.abort();
  }, [refreshKey]);

  const isLoading = forecasts.some((forecast) => forecast.status === "loading");
  const firstReadyForecast = forecasts.find(
    (forecast): forecast is Extract<ForecastState, { status: "ready" }> =>
      forecast.status === "ready",
  );

  return (
    <section className="weather-forecast" data-pencil-name="Region Weather">
      <header className="weather-forecast-header">
        <div>
          <p className="weather-forecast-eyebrow">THREE-DAY WEATHER FORECAST</p>
          <h2>Thailand, over the next three days</h2>
        </div>
        <div className="weather-forecast-meta">
          <p className="weather-forecast-note">
            {updatedAt
              ? `Updated ${formatUpdatedAt(updatedAt)} · Thailand time`
              : "Live forecast · Thailand time"}
          </p>
          <button
            className="weather-refresh"
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={isLoading}
          >
            {isLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="weather-table-wrap" aria-live="polite">
        <table className="weather-table">
          <thead>
            <tr>
              <th scope="col">Region</th>
                {[0, 1, 2].map((dayIndex) => (
                  <th scope="col" key={dayIndex}>
                    {firstReadyForecast
                      ? formatForecastDate(firstReadyForecast.days[dayIndex].date)
                      : `Day ${dayIndex + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecasts.map((forecast) => {
                if (forecast.status === "loading") {
                  return (
                    <tr className="weather-status-row" key={forecast.place.name}>
                      <td colSpan={4}>Loading {forecast.place.name} forecast…</td>
                    </tr>
                  );
                }
                if (forecast.status === "error") {
                  return (
                    <tr className="weather-status-row weather-error-row" key={forecast.place.name}>
                      <td colSpan={4}>
                        <strong>{forecast.place.name}:</strong> {forecast.message}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={forecast.place.name}>
                    <th className="weather-region-cell" scope="row">
                      {forecast.place.name}
                    </th>
                    {forecast.days.map((day) => (
                      <td data-label={formatForecastDate(day.date)} key={day.date}>
                        <span className="weather-condition">
                          {weatherDescription(day.weatherCode)}
                        </span>
                        <span className="weather-temperature-cell">
                          {Math.round(day.high)}° / {Math.round(day.low)}°C
                        </span>
                        <span className="weather-rain-chance">
                          Rain {day.rainChance === null ? "—" : `${day.rainChance}%`}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <p className="weather-attribution">
        Weather data by <a href="https://open-meteo.com/">Open-Meteo</a>
      </p>
    </section>
  );
}
