const fs = require('fs');
const path = require('path');

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

exports.handler = async function (event) {
  const { lat, lon } = event.queryStringParameters;
  if (!lat || !lon) {
    return { statusCode: 400, body: "Lat/lon ontbreekt" };
  }

  let ships = [];
  try {
    ships = JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {}

  ships = ships.filter(s => Date.now() - s.timestamp < 2 * 60 * 60 * 1000);
  ships.forEach(s => {
    s.distance = calculateDistance(lat, lon, s.lat, s.lon);
  });

  const nearest = ships.sort((a, b) => a.distance - b.distance)[0] || {};
  return {
    statusCode: 200,
    body: JSON.stringify(nearest)
  };
};
