'use strict';

/**
 * @file Unit tests for the Open-Meteo weather proxy.
 *
 * Only the pure helpers are tested here; the network call itself is exercised
 * manually through `GET /api/weather` and `GET /api/weather/events/:eventId`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WEATHER_CODES,
  describeWeatherCode,
  normaliseForecast
} = require('../src/services/weatherService');

test('every weather code from the assessment brief has a description', () => {
  // The brief lists 1, 2 and "2003" for mainly clear / partly cloudy / overcast;
  // 2003 is a typo for 3, so code 3 must be present as well.
  [0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 80, 81, 82, 95].forEach((code) => {
    assert.ok(WEATHER_CODES[code], `weather code ${code} is missing`);
    assert.equal(typeof WEATHER_CODES[code].label, 'string');
    assert.ok(WEATHER_CODES[code].label.length > 0);
  });
});

test('describeWeatherCode returns a label and an icon', () => {
  const overcast = describeWeatherCode(3);
  assert.equal(overcast.code, 3);
  assert.match(overcast.label, /Overcast/i);
  assert.ok(overcast.icon.length > 0);
});

test('describeWeatherCode falls back for unknown codes', () => {
  const unknown = describeWeatherCode(9999);
  assert.equal(unknown.code, 9999);
  assert.equal(unknown.label, 'Unsettled weather');
});

test('normaliseForecast flattens the Open-Meteo daily arrays', () => {
  const forecast = normaliseForecast(
    {
      latitude: -33.87,
      longitude: 151.21,
      timezone: 'Australia/Sydney',
      daily: {
        time: ['2026-11-07', '2026-11-08'],
        weather_code: [3, 61],
        temperature_2m_max: [24.5, 19.1],
        temperature_2m_min: [15.2, 12.0]
      }
    },
    { latitude: -33.87, longitude: 151.21, timezone: 'Australia/Sydney' }
  );

  assert.equal(forecast.days.length, 2);
  assert.equal(forecast.unit, '°C');
  assert.match(forecast.source, /Open-Meteo/);
  assert.deepEqual(forecast.days[0], {
    date: '2026-11-07',
    code: 3,
    label: WEATHER_CODES[3].label,
    icon: WEATHER_CODES[3].icon,
    temperatureMax: 24.5,
    temperatureMin: 15.2
  });
  assert.equal(forecast.days[1].label, WEATHER_CODES[61].label);
});

test('normaliseForecast tolerates an empty payload', () => {
  const forecast = normaliseForecast({}, { latitude: 0, longitude: 0, timezone: 'Australia/Sydney' });
  assert.deepEqual(forecast.days, []);
});
