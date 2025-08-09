// ===================== STATE =====================
// 1) API/Data state
const stateData = {
  allShows: [],
  allEpisodes: [],
  fetchCache: new Map(),
  currentShowId: null,
  episodeCounter: 0,
};

// 2) Search/UI mode state
const stateSearch = {
  view: "shows",          // 'shows' | 'episodes'
  value: "",              // current search query (lowercased, trimmed)
};

// 3) Pagination state
const statePagination = {
  currentPage: 1,
  itemsPerPage: 12,       // 12 episodes (4x3) or 12 shows
  totalPages: 1,
  currentDisplayList: [],
  currentType: "shows",   // 'shows' | 'episodes'
};

// ===================== FETCH HELPERS =====================
async function fetchWithCache(url) {
  if (stateData.fetchCache.has(url)) {
    console.log("Using cache for:", url);
    return stateData.fetchCache.get(url);
  }
  console.log("Fetching from network:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  const data = await res.json();
  stateData.fetchCache.set(url, data);
  return data;
}

async function fetchAllShows(maxPages = 10) {
  const all = [];
  async function getPage(page = 0) {
    const url = `https://api.tvmaze.com/shows?page=${page}`;
    try {
      const data = await fetchWithCache(url);
      if (!Array.isArray(data) || data.length === 0) return;
      all.push(...data);
      if (page + 1 < maxPages) await getPage(page + 1);
    } catch (err) {
      console.error("Failed fetching show page", page, err);
    }
  }
  await getPage(0);
  return all.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

function fetchEpisodesByShowId(showId) {
  const wait = document.createElement("p");
  wait.id = "status-message";
  wait.textContent = "Loading episodes...";
  document.body.prepend(wait);

  fetch(`https://api.tvmaze.com/shows/${showId}/episodes`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load episodes");
      return res.json();
    })
    .then((episodes) => {
      stateData.currentShowId = showId;
      stateData.allEpisodes = episodes;
      stateData.episodeCounter = episodes.length;

      document.getElementById("status-message")?.remove();

      dropBoxFill(stateData.allEpisodes);
      switchToEpisodesView();
      makePageForEpisodes(stateData.allEpisodes);
    })
    .catch((err) => {
      console.error("Error:", err);
      const msg = document.getElementById("status-message");
      if (msg) msg.textContent = "⚠️ Failed to load episodes. Please try again later.";
    });
}

// ===================== SETUP =====================
async function setup() {
  stateData.allShows = await fetchAllShows();
  dropBoxAllShows(stateData.allShows);
  switchToShowsView();

  // Event listeners
  document.getElementById("showSearchInput")
    .addEventListener("input", handleShowSearchEvent);

  document.getElementById("episodeSearchInput")
    .addEventListener("input", handleEpisodeSearchEvent);

  document.getElementById("dropDownBoxFill")
    .addEventListener("change", handleEpisodeDropDownChange);

  document.getElementById("dDBAllShows")
    .addEventListener("change", handleShowDropDownChange);

  document.getElementById("backToShows")
    .addEventListener("click", (e) => {
      e.preventDefault();
      switchToShowsView();
    });

  document.getElementById("prevBtn")
    .addEventListener("click", () => {
      if (statePagination.currentPage > 1) {
        statePagination.currentPage--;
        displayPage(statePagination.currentDisplayList, statePagination.currentType);
      }
    });

  document.getElementById("nextBtn")
    .addEventListener("click", () => {
      if (statePagination.currentPage < statePagination.totalPages) {
        statePagination.currentPage++;
        displayPage(statePagination.currentDisplayList, statePagination.currentType);
      }
    });

  document.getElementById("itemsPerPageSelect")
    .addEventListener("change", (e) => {
      statePagination.itemsPerPage = parseInt(e.target.value, 10);
      statePagination.currentPage = 1;
      displayPage(statePagination.currentDisplayList, statePagination.currentType);
    });
}

// ===================== EVENT HANDLERS =====================
function handleShowDropDownChange(e) {
  const selectedId = e.target.value;
  if (selectedId === "allShows") {
    switchToShowsView();
  } else {
    fetchEpisodesByShowId(selectedId);
  }
}

function handleEpisodeDropDownChange(e) {
  const selectedId = e.target.value;
  if (selectedId === "all") {
    makePageForEpisodes(stateData.allEpisodes);
  } else {
    const selectedEpisode = stateData.allEpisodes.filter((ep) => ep.id == selectedId);
    makePageForEpisodes(selectedEpisode);
  }
}

function handleShowSearchEvent(e) {
  stateSearch.value = e.target.value.toLowerCase().trim();
  if (stateSearch.view !== "shows") return;

  if (stateSearch.value === "") {
    makePageForShows(stateData.allShows);
  } else {
    const filtered = stateData.allShows.filter((show) => {
      const name = show.name.toLowerCase();
      const summary = show.summary ? show.summary.toLowerCase() : "";
      const genres = show.genres ? show.genres.join(" ").toLowerCase() : "";
      return (
        name.includes(stateSearch.value) ||
        summary.includes(stateSearch.value) ||
        genres.includes(stateSearch.value)
      );
    });
    makePageForShows(filtered);
  }
}

function handleEpisodeSearchEvent(e) {
  stateSearch.value = e.target.value.toLowerCase().trim();
  if (stateSearch.view !== "episodes") return;

  if (stateSearch.value === "") {
    document.getElementById("dropDownBoxFill").value = "all";
    makePageForEpisodes(stateData.allEpisodes);
  } else {
    const filtered = stateData.allEpisodes.filter((ep) => {
      const name = ep.name.toLowerCase();
      const summary = ep.summary ? ep.summary.toLowerCase() : "";
      return name.includes(stateSearch.value) || summary.includes(stateSearch.value);
    });
    makePageForEpisodes(filtered);
  }
}

// ===================== VIEW MANAGEMENT =====================
function switchToShowsView() {
  stateSearch.view = "shows";
  statePagination.currentType = "shows";

  document.getElementById("episode-controls").style.display = "none";
  document.getElementById("onShow").style.display = "block";
  document.getElementById("showSearchInput").style.display = "block";
  document.querySelector('label[for="showSearchInput"]').style.display = "block";
  document.getElementById("backToShows").style.display = "none";

  makePageForShows(stateData.allShows);
}

function switchToEpisodesView() {
  stateSearch.view = "episodes";
  statePagination.currentType = "episodes";

  document.getElementById("episode-controls").style.display = "flex";
  document.getElementById("onShow").style.display = "none";
  document.getElementById("backToShows").style.display = "block";
  document.getElementById("backToShows").style.display = "block";
  document.getElementById("searchCounter").style.display = "block";
}

// ===================== HELPERS =====================
function padNumber(num) {
  return num.toString().padStart(2, "0");
}
function formatEpisodeCode(season, number) {
  return `S${padNumber(season)}E${padNumber(number)}`;
}
function searchCounter(list, total, type = "shows") {
  if (type === "shows") {
    const el = document.getElementById("showSearchCounter");
    if (el) el.textContent = `Displaying ${list.length}/${total} show(s)`;
  } else {
    const el = document.getElementById("episodeSearchCounter");
    if (el) el.textContent = `Displaying ${list.length}/${total} episode(s)`;
  }
}

function dropBoxFill(episodes) {
  const box = document.getElementById("dropDownBoxFill");
  box.innerHTML = "";
  box.add(new Option("Show All Episodes", "all"));
  episodes.forEach((ep) => {
    box.add(new Option(`${formatEpisodeCode(ep.season, ep.number)} - ${ep.name}`, ep.id));
  });
}

function dropBoxAllShows(shows) {
  const box = document.getElementById("dDBAllShows");
  box.innerHTML = "";
  box.add(new Option("Show All Shows", "allShows"));
  shows.forEach((show) => {
    box.add(new Option(show.name, show.id));
  });
}

// ===================== RENDERERS =====================
function renderShowsPage(shows) {
  const container = document.getElementById("cardContainer");
  const tpl = document.getElementById("show-template");
  container.className = "container";
  container.innerHTML = "";

  if (shows.length === 0) {
    container.innerHTML = "<p>No shows available.</p>";
    return;
  }

  shows.forEach((s) => {
    const clone = tpl.content.cloneNode(true);

    const img = clone.querySelector("img");
    if (s.image?.medium) {
      img.src = s.image.medium; img.alt = s.name;
    } else {
      img.src = "https://via.placeholder.com/250x140?text=No+Image";
      img.alt = "No image available";
    }

    clone.querySelector(".title").textContent = s.name;
    const rating = s.rating?.average ?? "N/A";
    clone.querySelector(".rating").textContent = `rating: ⭐️ ${rating}`;
    clone.querySelector(".card-genres").textContent = `Genres: ${s.genres.join(", ")}`;
    clone.querySelector(".status").textContent = `Status: ${s.status || "Unknown"}`;
    clone.querySelector(".runtime").textContent = `Run-Time: ${s.runtime ? `${s.runtime} min` : "N/A"}`;
    clone.querySelector(".summary").textContent = s.summary ? s.summary.replace(/<[^>]+>/g, "") : "No summary available.";

    const btn = document.createElement("button");
    btn.className = "selectThisShow";
    btn.textContent = "▶️ Watch Show";
    btn.addEventListener("click", () => {
      document.getElementById("dDBAllShows").value = s.id;
      fetchEpisodesByShowId(s.id);
    });
    clone.querySelector(".showCard").appendChild(btn);

    container.append(clone);
  });
}

function renderEpisodesPage(episodes) {
  const container = document.getElementById("cardContainer");
  const tpl = document.getElementById("episode-template");
  container.className = "container episodes";
  container.innerHTML = "";

  if (episodes.length === 0) {
    container.innerHTML = "<p>No episodes match your search.</p>";
    return;
  }

  episodes.forEach((ep) => {
    const clone = tpl.content.cloneNode(true);

    const img = clone.querySelector(".epi-img");
    if (ep.image?.medium) {
      img.src = ep.image.medium; img.alt = ep.name;
    } else {
      img.src = "https://via.placeholder.com/250x140?text=No+Image";
      img.alt = "No image available";
    }

    clone.querySelector(".title").textContent = ep.name;
    clone.querySelector(".code").textContent =
      (ep.season != null && ep.number != null) ? formatEpisodeCode(ep.season, ep.number) : "Show";
    clone.querySelector(".summary").textContent = ep.summary ? ep.summary.replace(/<[^>]+>/g, "") : "No summary available.";

    container.append(clone);
  });
}

// ===================== PAGE MAKERS (with pagination) =====================
function makePageForShows(list) {
  statePagination.currentPage = 1;
  statePagination.currentType = "shows";
  searchCounter(list, stateData.allShows.length, "shows");
  displayPage(list, "shows");
}

function makePageForEpisodes(list) {
  statePagination.currentPage = 1;
  statePagination.currentType = "episodes";
  searchCounter(list, stateData.episodeCounter, "episodes");
  displayPage(list, "episodes");
}

// ===================== PAGINATION =====================
function createPagination(items, type) {
  statePagination.currentDisplayList = items;
  statePagination.totalPages = Math.ceil(items.length / statePagination.itemsPerPage);

  const container = document.getElementById("pagination-container");
  if (!container) return;
  const pageNumbers = container.querySelector(".page-numbers");
  const pageInfo = container.querySelector(".page-info");
  if (!pageNumbers || !pageInfo) return;

  if (statePagination.totalPages <= 1) {
    container.style.display = "none";
    pageNumbers.innerHTML = "";
    pageInfo.textContent = "Page 1 of 1";
    return;
  }

  container.style.display = "flex";
  pageNumbers.innerHTML = "";

  const startPage = Math.max(1, statePagination.currentPage - 2);
  const endPage = Math.min(statePagination.totalPages, startPage + 4);

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = `pagination-btn page-number ${i === statePagination.currentPage ? "active" : ""}`;
    btn.addEventListener("click", () => {
      statePagination.currentPage = i;
      displayPage(statePagination.currentDisplayList, type);
    });
    pageNumbers.appendChild(btn);
  }

  pageInfo.textContent = `Page ${statePagination.currentPage} of ${statePagination.totalPages}`;
}

function displayPage(items, type) {
  const start = (statePagination.currentPage - 1) * statePagination.itemsPerPage;
  const end = start + statePagination.itemsPerPage;
  const pageItems = items.slice(start, end);

  if (type === "episodes") {
    renderEpisodesPage(pageItems);
  } else {
    renderShowsPage(pageItems);
  }

  statePagination.currentType = type;
  createPagination(items, type);

  document.getElementById("cardContainer").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ===================== BOOT =====================
window.onload = setup;
