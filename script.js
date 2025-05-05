navigator.geolocation.getCurrentPosition(async (pos) => {
  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;

  const response = await fetch(`/.netlify/functions/getNearestShip?lat=${lat}&lon=${lon}`);
  const ship = await response.json();

  const el = document.getElementById("result");
  if (ship.name) {
    el.textContent = `Dichtstbijzijnde schip: ${ship.name} (${ship.distance.toFixed(2)} km)`;
  } else {
    el.textContent = "Geen schip gevonden.";
  }
}, () => {
  document.getElementById("result").textContent = "Kon locatie niet ophalen.";
});
