const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const locationBtn = document.getElementById('location-btn');
const errorMsg = document.getElementById('error-msg');
const weatherLayout = document.getElementById('weather-layout');
const placeholderState = document.getElementById('placeholder-state');
const loadingState = document.getElementById('loading-state');

const cityNameEl = document.getElementById('city-name');
const countryNameEl = document.getElementById('country-name');
const localTimeEl = document.getElementById('local-time');
const weatherIconEl = document.getElementById('weather-icon');
const tempMainEl = document.getElementById('temp-main');
const conditionEl = document.getElementById('condition-text');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const feelsLikeEl = document.getElementById('feels-like');
const forecastGrid = document.getElementById('forecast-grid');
const btnC = document.getElementById('btn-c');
const btnF = document.getElementById('btn-f');

let unit = 'C';
let lastData = null;

const WEATHER_CODES = {
  0:  { label: 'Clear Sky',      icon: '☀️' },
  1:  { label: 'Mainly Clear',   icon: '🌤️' },
  2:  { label: 'Partly Cloudy',  icon: '⛅' },
  3:  { label: 'Overcast',       icon: '☁️' },
  45: { label: 'Foggy',          icon: '🌫️' },
  48: { label: 'Icy Fog',        icon: '🌫️' },
  51: { label: 'Light Drizzle',  icon: '🌦️' },
  53: { label: 'Drizzle',        icon: '🌦️' },
  55: { label: 'Heavy Drizzle',  icon: '🌧️' },
  61: { label: 'Light Rain',     icon: '🌧️' },
  63: { label: 'Rain',           icon: '🌧️' },
  65: { label: 'Heavy Rain',     icon: '🌧️' },
  71: { label: 'Light Snow',     icon: '🌨️' },
  73: { label: 'Snow',           icon: '❄️' },
  75: { label: 'Heavy Snow',     icon: '❄️' },
  77: { label: 'Snow Grains',    icon: '🌨️' },
  80: { label: 'Rain Showers',   icon: '🌦️' },
  81: { label: 'Rain Showers',   icon: '🌧️' },
  82: { label: 'Violent Showers',icon: '🌧️' },
  85: { label: 'Snow Showers',   icon: '🌨️' },
  86: { label: 'Heavy Snow Showers', icon: '❄️' },
  95: { label: 'Thunderstorm',   icon: '⛈️' },
  96: { label: 'Thunderstorm + Hail', icon: '⛈️' },
  99: { label: 'Thunderstorm + Hail', icon: '⛈️' },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { label: 'Unknown', icon: '🌡️' };
}

function toF(c) { return Math.round(c * 9/5 + 32); }

function formatTemp(c) {
  return unit === 'C' ? `${Math.round(c)}°C` : `${toF(c)}°F`;
}

function getDayLabel(dateStr, index) {
  if (index === 0) return 'Today';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function showLoading() {
  placeholderState.hidden = true;
  weatherLayout.hidden = true;
  errorMsg.hidden = true;
  loadingState.hidden = false;
}

function showError(msg) {
  loadingState.hidden = true;
  weatherLayout.hidden = true;
  placeholderState.hidden = true;
  errorMsg.hidden = false;
  errorMsg.textContent = msg;
}

function showWeather() {
  loadingState.hidden = true;
  placeholderState.hidden = true;
  errorMsg.hidden = true;
  weatherLayout.hidden = false;
}

function renderWeather(data) {
  const { current, daily, city, country, timezone } = data;
  const info = getWeatherInfo(current.weather_code);

  cityNameEl.textContent = city;
  countryNameEl.textContent = country;

  const now = new Date().toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  localTimeEl.textContent = now;

  weatherIconEl.textContent = info.icon;
  tempMainEl.textContent = formatTemp(current.temperature_2m);
  conditionEl.textContent = info.label;
  humidityEl.textContent = `${current.relative_humidity_2m}%`;
  windSpeedEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  feelsLikeEl.textContent = formatTemp(current.apparent_temperature);

  forecastGrid.innerHTML = '';
  daily.time.forEach((dateStr, i) => {
    const dayInfo = getWeatherInfo(daily.weather_code[i]);
    const card = document.createElement('div');
    card.className = 'forecast-day' + (i === 0 ? ' today' : '');
    card.innerHTML = `
      <div class="forecast-label">${getDayLabel(dateStr, i)}</div>
      <div class="forecast-icon">${dayInfo.icon}</div>
      <div class="forecast-high">${formatTemp(daily.temperature_2m_max[i])}</div>
      <div class="forecast-low">${formatTemp(daily.temperature_2m_min[i])}</div>
    `;
    forecastGrid.appendChild(card);
  });

  showWeather();
}

async function fetchByCoords(lat, lon, cityOverride) {
  showLoading();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    data.city = cityOverride || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    data.country = '';
    lastData = data;
    renderWeather(data);
  } catch {
    showError('Failed to fetch weather data. Please try again.');
  }
}

async function fetchByCity(query) {
  showLoading();
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error('Geocoding failed');
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showError(`City "${query}" not found. Try a different spelling.`);
      return;
    }

    const place = geoData.results[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;
    const weatherRes = await fetch(url);
    if (!weatherRes.ok) throw new Error('Weather fetch failed');
    const data = await weatherRes.json();
    data.city = place.name;
    data.country = [place.admin1, place.country].filter(Boolean).join(', ');
    lastData = data;
    renderWeather(data);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q) fetchByCity(q);
});

locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  locationBtn.textContent = 'Detecting...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locationBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        Use my location`;
      fetchByCoords(pos.coords.latitude, pos.coords.longitude, 'My Location');
    },
    () => {
      locationBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
        Use my location`;
      showError('Location access denied. Please search for a city instead.');
    }
  );
});

[btnC, btnF].forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.unit === unit) return;
    unit = btn.dataset.unit;
    btnC.classList.toggle('active', unit === 'C');
    btnF.classList.toggle('active', unit === 'F');
    if (lastData) renderWeather(lastData);
  });
});
