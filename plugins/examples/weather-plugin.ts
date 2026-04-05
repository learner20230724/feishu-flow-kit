/**
 * Weather Plugin — `/weather <city> [unit]`
 *
 * Fetches current weather for a city using wttr.in (free, no API key required).
 * Demonstrates: HTTP GET requests, JSON parsing, Feishu rich card with image,
 * environment variable configuration, error handling, AbortController timeout.
 *
 * @example
 * /weather Beijing
 * /weather Tokyo c    ← c=Celsius, f=Fahrenheit
 */

import { McpTool, FeishuCard, FeishuCardAction, FeishuCardElement } from '@feishu/rest-api';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

export const weatherPlugin = {
  name: 'weather',
  description: 'Get current weather for any city',
  usage: '/weather <city> [c|f]',
  shortcuts: ['w'],

  // Register as a text command — fires on any message containing the trigger
  register(tool: McpTool) {
    tool.onText(
      /^/(?:weather|w)\s+(?<city>[^\s]+)(?:\s+(?<unit>[cf]))?/i,
      async ({ city, unit = 'c' }: { city: string; unit?: string }, event, api) => {
        const isCelsius = unit.toLowerCase() === 'c' || !unit;
        const tempUnit = isCelsius ? '°C' : '°F';

        try {
          // Fetch weather data — wttr.in returns JSON at /:city?format=j1
          const response = await axios.get(
            `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
            {
              timeout: 5000,
              headers: { 'User-Agent': 'feishu-flow-kit/1.0' },
            }
          );

          const current = response.data?.current_condition?.[0];
          if (!current) {
            throw new Error(`No weather data found for "${city}"`);
          }

          const temp = isCelsius
            ? current.temp_C
            : current.temp_F;
          const condition = current.weatherDesc?.[0]?.value ?? 'Unknown';
          const humidity = current.humidity;
          const wind = isCelsius
            ? `${current.windspeedKmph} km/h`
            : `${current.miles_per_hour} mph`;
          const feelsLike = isCelsius
            ? current.FeelsLikeC
            : current.FeelsLikeF;
          const uvIndex = current.UVIndex;
          const visibility = current.visibility;
          const icon = getWeatherEmoji(condition);

          // Build Feishu rich card
          const card: FeishuCard = {
            config: { wide_screen_mode: true },
            header: {
              title: { tag: 'plain_text', content: `🌤️  ${capitalize(city)} Weather` },
              subtitle: { tag: 'plain_text', content: condition },
              template: 'blue',
            },
            elements: [
              // Temperature hero
              {
                tag: 'div',
                text: {
                  tag: 'lark_md',
                  content: `## **${temp}${tempUnit}**  ${icon}\nFeels like ${feelsLike}${tempUnit} · ${condition}`,
                },
              },
              { tag: 'hr' },
              // Details grid
              {
                tag: 'note',
                elements: [
                  { tag: 'plain_text', content: `💧 Humidity: **${humidity}%**` },
                  { tag: 'plain_text', content: `💨 Wind: **${wind}**` },
                  { tag: 'plain_text', content: `👁️ Visibility: **${visibility} km**` },
                  { tag: 'plain_text', content: `☀️ UV Index: **${uvIndex}**` },
                ],
              },
              { tag: 'hr' },
              // Footer
              {
                tag: 'note',
                elements: [
                  {
                    tag: 'plain_text',
                    content: `wttr.in · Updated ${current.observation_time} · /weather ${city} ${isCelsius ? 'f' : 'c'} to toggle`,
                  },
                ],
              },
            ],
          };

          await api.createMessage({
            receive_id: event.sender.sender_id.open_id,
            msg_type: 'interactive',
            content: JSON.stringify(card),
          });
        } catch (err: any) {
          if (err.code === 'ECONNABORTED' || err.response?.status === 429) {
            await api.createMessage({
              receive_id: event.sender.sender_id.open_id,
              msg_type: 'text',
              content: `⏱️ Weather service timed out for "${city}". Please try again in a moment.`,
            });
          } else {
            await api.createMessage({
              receive_id: event.sender.sender_id.open_id,
              msg_type: 'text',
              content: `❌ Could not fetch weather for "${city}". Check the city name and try again.\n\`/weather <city> [c|f]\``,
            });
          }
        }
      }
    );
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeatherEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('sun') || c.includes('clear')) return '☀️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  if (c.includes(' haze ')) return '🌤️';
  return '🌡️';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
