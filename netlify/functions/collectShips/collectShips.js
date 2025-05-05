exports.schedule = "*/15 * * * *";

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

exports.schedule = "*/15 * * * *"; // elke 15 minuten

const ROTTERDAM_CENTER = { lat: 51.9475, lon: 4.1342 };
const MAX_DISTANCE_KM = 20;
const DATA_FILE = path.join(__dirname, '../../ships.json');

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.handler = async function () {
  const authToken = process.env.AISSTREAM_API_TOKEN;
  const ships = [];

  return new Promise((resolve) => {
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream", {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    ws.on('open', () => {
      ws.send(JSON.stringify({
        APIKey: authToken,
        Subscribe: {
          BoundingBoxes: [{
            NorthEast: { Lat: ROTTERDAM_CENTER.lat + 0.2, Lon: ROTTERDAM_CENTER.lon + 0.2 },
            SouthWest: { Lat: ROTTERDAM_CENTER.lat - 0.2, Lon: ROTTERDAM_CENTER.lon - 0.2 }
          }]
        }
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.Metadata?.Type === "PositionReport") {
          const ship = msg.Payload;
          const distance = calculateDistance(
            ROTTERDAM_CENTER.lat, ROTTERDAM_CENTER.lon,
            ship.Lat, ship.Lon
          );
          if (distance <= MAX_DISTANCE_KM) {
            ships.push({
              name: ship.Name || "Onbekend",
              lat: ship.Lat,
              lon: ship.Lon,
              timestamp: Date.now(),
              mmsi: ship.MMSI
            });
          }
        }
      } catch {}
    });

    setTimeout(() => {
      ws.close();
      let existing = [];
      try {
        existing = JSON.parse(fs.readFileSync(DATA_FILE));
      } catch {}
      const recent = existing.filter(s => Date.now() - s.timestamp < 2 * 60 * 60 * 1000);
      const combined = [...recent, ...ships];
      fs.writeFileSync(DATA_FILE, JSON.stringify(combined, null, 2));
      resolve({ statusCode: 200, body: "Schepen opgeslagen" });
    }, 10000);
  });
};
