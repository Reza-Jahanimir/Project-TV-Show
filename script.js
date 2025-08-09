// ===================== STATE =====================
// API/Data state
const stateData = {
  allShows: [],
  allEpisodes: [],
  fetchCache: new Map(),
  currentShowId: null,
  episodeCounter: 0,
};

// Search/UI mode state
const stateSearch = {
  view: "shows",          // 'shows' | 'episodes'
  value: "",              
};

// Pagination state
const statePagination = {
  currentPage: 1,
  itemsPerPage: 12,       
  totalPages: 1,
  currentDisplayList: [],
  currentType: "shows",   // 'shows' | 'episodes'
};

//  ----------------------- Pagination Functions ------------------------

/**
 * Creates pagination controls and handles page navigation
 * @param {Array} items - Array of items to paginate
 * @param {string} type - 'shows' or 'episodes'
 */
function createPagination(items, type) {
  statePagination.currentDisplayList = items;
  statePagination.totalPages = Math.ceil(items.length / statePagination.itemsPerPage);
  statePagination.currentType = type;
  
  // Create pagination container
  let paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    paginationContainer.className = 'pagination-container';
    
    // Insert after the card container
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.parentNode.insertBefore(paginationContainer, cardContainer.nextSibling);
  }
  
  // Clear existing pagination
  paginationContainer.innerHTML = '';
  
  if (statePagination.totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '← Previous';
  prevBtn.className = 'pagination-btn';
  prevBtn.disabled = statePagination.currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (statePagination.currentPage > 1) {
      statePagination.currentPage--;
      displayPage(statePagination.currentDisplayList, statePagination.currentType);
    }
  });
  paginationContainer.appendChild(prevBtn);
  
  // Page info
  const pageInfo = document.createElement('span');
  pageInfo.className = 'page-info';
  pageInfo.textContent = `Page ${statePagination.currentPage} of ${statePagination.totalPages}`;
  paginationContainer.appendChild(pageInfo);
  
  // Page numbers (show up to 5 page numbers)
  const startPage = Math.max(1, statePagination.currentPage - 2);
  const endPage = Math.min(statePagination.totalPages, startPage + 4);
  
  const pageNumbers = document.createElement('div');
  pageNumbers.className = 'page-numbers';
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.className = `pagination-btn page-number ${i === statePagination.currentPage ? 'active' : ''}`;
    pageBtn.addEventListener('click', () => {
      statePagination.currentPage = i;
      displayPage(statePagination.currentDisplayList, statePagination.currentType);
    });
    pageNumbers.appendChild(pageBtn);
  }
  paginationContainer.appendChild(pageNumbers);
  
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next →';
  nextBtn.className = 'pagination-btn';
  nextBtn.disabled = statePagination.currentPage === statePagination.totalPages;
  nextBtn.addEventListener('click', () => {
    if (statePagination.currentPage < statePagination.totalPages) {
      statePagination.currentPage++;
      displayPage(statePagination.currentDisplayList, statePagination.currentType);
    }
  });
  paginationContainer.appendChild(nextBtn);
  
  // Items per page selector
  const itemsPerPageContainer = document.createElement('div');
  itemsPerPageContainer.className = 'items-per-page';
  
  const label = document.createElement('label');
  label.textContent = 'Items per page: ';
  
  const select = document.createElement('select');
  select.className = 'items-per-page-select';
  [6, 12, 24, 48].forEach(num => {
    const option = document.createElement('option');
    option.value = num;
    option.textContent = num;
    option.selected = num === statePagination.itemsPerPage;
    select.appendChild(option);
  });
  
  select.addEventListener('change', (e) => {
    statePagination.itemsPerPage = parseInt(e.target.value);
    statePagination.currentPage = 1; // Reset to first page
    displayPage(statePagination.currentDisplayList, statePagination.currentType);
  });
  
  itemsPerPageContainer.appendChild(label);
  itemsPerPageContainer.appendChild(select);
  paginationContainer.appendChild(itemsPerPageContainer);
}

/**
 * Displays a specific page of items
 * @param {Array} items - Array of items to display
 * @param {string} type - 'shows' or 'episodes'
 */
function displayPage(items, type) {
  const startIndex = (statePagination.currentPage - 1) * statePagination.itemsPerPage;
  const endIndex = startIndex + statePagination.itemsPerPage;
  const pageItems = items.slice(startIndex, endIndex);
  
  if (type === 'episodes') {
    renderEpisodesPage(pageItems);
  } else {
    renderShowsPage(pageItems);
  }
  
  createPagination(items, type);
  
  // Scroll to top of results
  document.getElementById('cardContainer').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

/**
 * Renders episode cards for current page only
 */
function renderEpisodesPage(episodes) {
  const containerEpisode = document.getElementById("cardContainer");
  const templateEpisode = document.getElementById("episode-template");

  containerEpisode.className = "container episodes";
  containerEpisode.innerHTML = "";

  if (episodes.length === 0) {
    containerEpisode.innerHTML = "<p>No episodes match your search.</p>";
    return;
  }

  episodes.forEach((eachRecord) => {
    const clone = templateEpisode.content.cloneNode(true);

    const img = clone.querySelector(".epi-img");
    if (eachRecord.image && eachRecord.image.medium) {
      img.src = eachRecord.image.medium;
      img.alt = eachRecord.name;
    } else {
      img.src = "https://via.placeholder.com/250x140?text=No+Image";
      img.alt = "No image available";
    }

    clone.querySelector(".title").textContent = eachRecord.name;
    clone.querySelector(".code").textContent =
      eachRecord.season !== undefined && eachRecord.number !== undefined
        ? formatEpisodeCode(eachRecord.season, eachRecord.number)
        : "Show";

    clone.querySelector(".summary").textContent =
      eachRecord.summary
        ? eachRecord.summary.replace(/<[^>]+>/g, "")
        : "No summary available.";

    containerEpisode.append(clone);
  });
}

/**
 * Renders show cards for current page only
 */
function renderShowsPage(shows) {
  const containerEpisode = document.getElementById("cardContainer");
  const templateShow = document.getElementById("show-template");

  containerEpisode.className = "container";
  containerEpisode.innerHTML = "";

  if (shows.length === 0) {
    containerEpisode.innerHTML = "<p>No shows available.</p>";
    return;
  }

  shows.forEach((eachShow) => {
    const clone = templateShow.content.cloneNode(true);

    const img = clone.querySelector("img");
    if (eachShow.image && eachShow.image.medium) {
      img.src = eachShow.image.medium;
      img.alt = eachShow.name;
    } else {
      img.src = "https://via.placeholder.com/250x140?text=No+Image";
      img.alt = "No image available";
    }

    clone.querySelector(".title").textContent = eachShow.name;

    const rating = eachShow.rating && eachShow.rating.average ? eachShow.rating.average : "N/A";
    clone.querySelector(".rating").textContent = `rating: ⭐️ ${rating}`;

    clone.querySelector(".card-genres").textContent = `Genres: ${eachShow.genres.join(", ")}`;

    const status = eachShow.status || "Unknown";
    clone.querySelector(".status").textContent = `Status: ${status}`;

    const runtime = eachShow.runtime ? `${eachShow.runtime} min` : "N/A";
    clone.querySelector(".runtime").textContent = `Run-Time: ${runtime}`;

    clone.querySelector(".summary").textContent =
      eachShow.summary
        ? eachShow.summary.replace(/<[^>]+>/g, "")
        : "No summary available.";

    const selectThisShow = document.createElement("button");
    selectThisShow.className = "selectThisShow";
    selectThisShow.textContent = "▶️ Watch Show";
    selectThisShow.addEventListener("click", function () {
      document.getElementById("dDBAllShows").value = eachShow.id;
      stateData.currentShowId = eachShow.id;
      fetchEpisodesByShowId(eachShow.id);
      switchToEpisodesView();
    });
    clone.querySelector(".showCard").appendChild(selectThisShow);

    containerEpisode.append(clone);
  });
}

//  ----------------------- Updated Main Functions ------------------------

/**
 * Updated function to use pagination
 */
function makePageForEpisodes(listOfApi) {
  statePagination.currentPage = 1; // Reset to first page
  searchCounter(listOfApi, stateData.episodeCounter, "episodes");
  displayPage(listOfApi, "episodes");
}

/**
 * Updated function to use pagination
 */
function makePageForShows(listOfShows) {
  statePagination.currentPage = 1; // Reset to first page
  searchCounter(listOfShows, stateData.allShows.length, "shows");
  displayPage(listOfShows, "shows");
}

//  ----------------------- fetch Functions ------------------------
async function fetchWithCache(url) {
  if (stateData.fetchCache.has(url)) {
    console.log("Using cache for:", url);
    return stateData.fetchCache.get(url);
  }

  console.log("Fetching from network:", url);
  try {
    const res = await fetch(url);
    console.log("Response status:", res.status);
    if (!res.ok) throw new Error(` Failed to fetch: ${url}`);
    const data = await res.json();
    console.log("Fetched data length:", data.length);
    stateData.fetchCache.set(url, data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

async function fetchAllShows(maxPages = 10) {
  let all = [];

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
  stateData.currentShowId = showId;
  
  const waitLoadMessage = document.createElement("p");
  waitLoadMessage.id = "status-message";
  waitLoadMessage.textContent = "Loading episodes...";
  document.body.prepend(waitLoadMessage);

  fetch(`https://api.tvmaze.com/shows/${showId}/episodes`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load episodes");
      return res.json();
    })
    .then((episodes) => {
      stateData.allEpisodes = episodes;
      stateData.episodeCounter = episodes.length;

      const msg = document.getElementById("status-message");
      if (msg) msg.remove();

      dropBoxFill(episodes);
      makePageForEpisodes(episodes);
    })
    .catch((err) => {
      console.error("Error:", err);
      const msg = document.getElementById("status-message");
      if (msg) {
        msg.textContent = "⚠️ Failed to load episodes. Please try again later.";
      }
    });
}

//  ----------------------- main setup  ------------------------
async function setup() {
  stateData.allShows = await fetchAllShows();
  dropBoxAllShows(stateData.allShows);
  switchToShowsView(stateData.allShows);
  console.log(stateData.allShows);

  // Event Listeners
  document
    .getElementById("showSearchInput")
    .addEventListener("input", handleShowSearchEvent);
  document
    .getElementById("episodeSearchInput")
    .addEventListener("input", handleEpisodeSearchEvent);
  document
    .getElementById("dropDownBoxFill")
    .addEventListener("change", handleEpisodeDropDownChange);
  document
    .getElementById("dDBAllShows")
    .addEventListener("change", handleShowDropDownChange);
  document
    .getElementById("backToShows")
    .addEventListener("click", function (e) {
      e.preventDefault();
      switchToShowsView();
    });
}

//  ----------------------- Event listener logic  ------------------------
function handleShowDropDownChange(event) {
  const selectedId = event.target.value;

  if (selectedId === "allShows") {
    switchToShowsView();
  } else {
    fetchEpisodesByShowId(selectedId);
  }
}

function handleEpisodeDropDownChange(event) {
  const selectedId = event.target.value;

  if (selectedId === "all") {
    makePageForEpisodes(stateData.allEpisodes);
  } else {
    const selectedEpisode = stateData.allEpisodes.filter((ep) => ep.id == selectedId);
    makePageForEpisodes(selectedEpisode);
  }
}

function handleShowSearchEvent(event) {
  const searchValue = event.target.value.toLowerCase().trim();
  stateSearch.value = searchValue;

  if (stateSearch.view === "shows") {
    if (searchValue === "") {
      makePageForShows(stateData.allShows);
    } else {
      const filtered = stateData.allShows.filter((show) => {
        const name = show.name.toLowerCase();
        const summary = show.summary ? show.summary.toLowerCase() : "";
        const genres = show.genres ? show.genres.join(" ").toLowerCase() : "";
        return (
          name.includes(searchValue) ||
          summary.includes(searchValue) ||
          genres.includes(searchValue)
        );
      });
      makePageForShows(filtered);
    }
  }
}

function handleEpisodeSearchEvent(event) {
  const searchValue = event.target.value.toLowerCase().trim();
  stateSearch.value = searchValue;

  if (stateSearch.view === "episodes") {
    if (searchValue === "") {
      document.getElementById("dropDownBoxFill").value = "all";
      makePageForEpisodes(stateData.allEpisodes);
    } else {
      const filtered = stateData.allEpisodes.filter((episode) => {
        const name = episode.name.toLowerCase();
        const summary = episode.summary ? episode.summary.toLowerCase() : "";
        return name.includes(searchValue) || summary.includes(searchValue);
      });
      makePageForEpisodes(filtered);
    }
  }
}

// ----------------------- View Management ------------------------
function switchToShowsView() {
  stateSearch.view = "shows";
  document.getElementById("episode-controls").style.display = "none";
  document.getElementById("onShow").style.display = "block";
  document.getElementById("showSearchInput").style.display = "block";
  document.querySelector('label[for="showSearchInput"]').style.display = "block";
  document.getElementById("backToShows").style.display = "none";
  makePageForShows(stateData.allShows);
}

function switchToEpisodesView() {
  stateSearch.view = "episodes";
  document.getElementById("episode-controls").style.display = "flex";
  document.getElementById("onShow").style.display = "none";
  document.getElementById("backToShows").style.display = "block";
  document.getElementById("searchCounter").style.display = "block";
}

//  ----------------------- Helper Function------------------------
function padNumber(num) {
  return num.toString().padStart(2, "0");
}

function formatEpisodeCode(season, number) {
  return `S${padNumber(season)}E${padNumber(number)}`;
}

function formatShowCode(number) {
  return `${padNumber(number)}`;
}

function searchCounter(list, total, type = "shows") {
  if (type === "shows") {
    const counter = document.getElementById("showSearchCounter");
    if (counter) {
      counter.textContent = `Displaying ${list.length}/${total} show(s)`;
    }
  } else if (type === "episodes") {
    const counter = document.getElementById("episodeSearchCounter");
    if (counter) {
      counter.textContent = `Displaying ${list.length}/${total} episode(s)`;
    }
  }
}

function searchEpisodes(allEpisodes, searchValue) {
  const filtered = searchValue
    ? allEpisodes.filter((episode) => {
        const name = episode.name.toLowerCase();
        const summary = episode.summary ? episode.summary.toLowerCase() : "";
        const search = searchValue.toLowerCase();
        return name.includes(search) || summary.includes(search);
      })
    : allEpisodes;
  makePageForEpisodes(filtered);
}

function dropBoxFill(episodes) {
  const dropDBox = document.getElementById("dropDownBoxFill");
  dropDBox.innerHTML = "";

  dropDBox.add(new Option("Show All Episodes", "all"));

  episodes.forEach((episode) => {
    dropDBox.add(
      new Option(
        `${formatEpisodeCode(episode.season, episode.number)} - ${
          episode.name
        }`,
        episode.id
      )
    );
  });
}

function dropBoxAllShows(allShows) {
  const dropDBoxShows = document.getElementById("dDBAllShows");
  dropDBoxShows.innerHTML = "";

  dropDBoxShows.add(new Option("Show All Shows", "allShows"));

  allShows.forEach((show) => {
    dropDBoxShows.add(new Option(show.name, show.id));
  });
}

// Initialize the application when the page loads
window.onload = setup;