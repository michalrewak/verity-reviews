const panel = document.querySelector("#verity-panel");
const hostPage = document.querySelector("#host-page");
const modal = document.querySelector("#review-modal");
const form = document.querySelector("#review-form");
const status = document.querySelector("#form-status");
const ratingInput = document.querySelector("#rating-input");
const scenarioData = {
  shop: {
    address: "nordgoods.example/products/field-pack-22",
    type: "Produkt",
    title: "Field Pack 22L",
    subtitle: "NØRD Goods · Model FP-22",
    image: "◒",
    score: "4.4",
    count: "12",
    formEntity: "Field Pack 22L · NØRD Goods",
    hostTitle: "Field Pack 22L"
  },
  maps: {
    address: "google.com/maps/place/Cafe+Mokka",
    type: "Miejsce",
    title: "Cafe Mokka",
    subtitle: "Kawiarnia · Warszawa, PL",
    image: "⌖",
    score: "4.7",
    count: "36",
    formEntity: "Cafe Mokka · Warszawa",
    hostTitle: "Cafe Mokka"
  },
  youtube: {
    address: "youtube.com/watch?v=review-field-pack",
    type: "Film",
    title: "Field Pack — test po 6 miesiącach",
    subtitle: "Kanał: Gear Without Hype",
    image: "▶",
    score: "4.6",
    count: "84",
    formEntity: "Field Pack — test po 6 miesiącach",
    hostTitle: "Field Pack — test po 6 miesiącach"
  }
};
let rating = 0;

function setPanel(open) {
  panel.classList.toggle("open", open);
  hostPage.classList.toggle("panel-open", open);
}

function changeScenario(name) {
  const scenario = scenarioData[name];
  document.querySelectorAll(".scenario").forEach((button) => {
    button.classList.toggle("active", button.dataset.scenario === name);
  });
  hostPage.className = `host-page ${name}-page panel-open`;
  document.querySelector("#address").textContent = scenario.address;
  document.querySelector("#detected-type").textContent = scenario.type;
  document.querySelector("#entity-title").textContent = scenario.title;
  document.querySelector("#entity-subtitle").textContent = scenario.subtitle;
  document.querySelector("#entity-image").textContent = scenario.image;
  document.querySelector("#score").textContent = scenario.score;
  document.querySelector("#review-count").textContent = scenario.count;
  document.querySelector("#form-entity").textContent = scenario.formEntity;
  document.querySelector(".product-details h1").textContent = scenario.hostTitle;
  panel.classList.add("open");
}

for (let value = 1; value <= 5; value += 1) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "★";
  button.setAttribute("aria-label", `${value} z 5`);
  button.addEventListener("click", () => {
    rating = value;
    document.querySelectorAll(".rating-input button").forEach((star, index) => {
      star.classList.toggle("selected", index < rating);
    });
  });
  ratingInput.append(button);
}

document.querySelector("#extension-button").addEventListener("click", () => setPanel(!panel.classList.contains("open")));
document.querySelector("#close-panel").addEventListener("click", () => setPanel(false));
document.querySelectorAll(".scenario").forEach((button) => button.addEventListener("click", () => changeScenario(button.dataset.scenario)));
document.querySelector("#new-review-button").addEventListener("click", () => {
  modal.hidden = false;
  document.querySelector("#review-text").focus();
});
document.querySelector("#close-modal").addEventListener("click", () => {
  modal.hidden = true;
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.hidden = true;
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (rating === 0) {
    status.textContent = "Najpierw wybierz ocenę.";
    return;
  }
  status.textContent = "Wersja robocza zapisana — kolejnym krokiem jest podpis.";
  form.querySelector("textarea").disabled = true;
  form.querySelector("button[type=submit]").disabled = true;
});

setTimeout(() => setPanel(true), 500);
