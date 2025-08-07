//  ----------------------- global variable ------------------------
let episodeCounter = 0;
let searchValue = "";
let allEpisodes = [];
let allShows = [];

let currentView = "shows"; // 'shows' or 'episodes'
let currentShowId = null;
let showCounter = 0;

let fetchCache = new Map();

//  ----------------------- fetch Functions ------------------------
// Purpose: To fetch data from an API only once per URL and reuse that response later instead of fetching it again from the network.
async function fetchWithCache(url) {
  if (fetchCache.has(url)) {
    console.log("Using cache for:", url);
    return fetchCache.get(url);
  }

  console.log("Fetching from network:", url);
  try {
    const res = await fetch(url);
    console.log("Response status:", res.status);
    if (!res.ok) throw new Error(` Failed to fetch: ${url}`);
    const data = await res.json();
    console.log("Fetched data length:", data.length);
    fetchCache.set(url, data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

/**
 * Fetches all TV shows from the TVMaze API and sorts them alphabetically
 * @returns {Promise<Array>} Array of show objects sorted by name, or empty array on error
 */
async function fetchAllShows(maxPages = 10) {
  let all = [];

  async function getPage(page = 0) {
    const url = `https://api.tvmaze.com/shows?page=${page}`;
    try {
      const data = await fetchWithCache(url);
      if (!Array.isArray(data) || data.length === 0) return;
      all.push(...data);
      if (page + 1 < maxPages) await getPage(page + 1);
      // else stop after maxPages
    } catch (err) {
      console.error("Failed fetching show page", page, err);
    }
  }

  await getPage(0);
  return all.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

/**
 * Fetches all episodes for a specific TV show by its ID
 * Shows loading message during fetch and updates UI when complete
 * @param {number|string} showId - The ID of the show to fetch episodes for
 */
function fetchEpisodesByShowId(showId) {
  // Add loading message specifically for episode fetch
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
      allEpisodes = episodes;
      episodeCounter = episodes.length;

      // Remove loading message only *after success*
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

/**
 * Main initialization function that runs when the page loads
 * Fetches shows, populates dropdowns, displays initial content, and sets up event listeners
 */
async function setup() {
  // Fetch all shows
  allShows = await fetchAllShows();
  dropBoxAllShows(allShows);
  switchToShowsView(allShows);
  console.log(allShows);
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

  selectThisShow.addEventListener("click", function () {
  document.getElementById("dDBAllShows").value = eachShow.id;
  fetchEpisodesByShowId(eachShow.id);
  switchToEpisodesView();
});
}

//  ----------------------- Event lister logic  ------------------------

/**
 * Handles show dropdown selection changes
 */
function handleShowDropDownChange(event) {
  const selectedId = event.target.value;

  if (selectedId === "allShows") {
    switchToShowsView();
  } else {
    fetchEpisodesByShowId(selectedId);
  }
}

/**
 * Handles episode dropdown selection changes
 */
function handleEpisodeDropDownChange(event) {
  const selectedId = event.target.value;

  if (selectedId === "all") {
    makePageForEpisodes(allEpisodes);
  } else {
    const selectedEpisode = allEpisodes.filter((ep) => ep.id == selectedId);
    makePageForEpisodes(selectedEpisode);
  }
}

/**
 * Handles show search input events
 */
function handleShowSearchEvent(event) {
  const searchValue = event.target.value.toLowerCase().trim();

  if (currentView === "shows") {
    if (searchValue === "") {
      makePageForShows(allShows);
    } else {
      const filtered = allShows.filter((show) => {
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

/**
 * Handles episode search input events
 */
function handleEpisodeSearchEvent(event) {
  const searchValue = event.target.value.toLowerCase().trim();

  if (currentView === "episodes") {
    if (searchValue === "") {
      document.getElementById("dropDownBoxFill").value = "all";
      makePageForEpisodes(allEpisodes);
    } else {
      const filtered = allEpisodes.filter((episode) => {
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
  currentView = "shows";
  document.getElementById("episode-controls").style.display = "none";
  document.getElementById("onShow").style.display = "block";
  document.getElementById("showSearchInput").style.display = "block";
  document.querySelector('label[for="showSearchInput"]').style.display = "block";
  document.getElementById("backToShows").style.display = "none"; // Hide back link
  makePageForShows(allShows);
}

function switchToEpisodesView() {
  currentView = "episodes";
  document.getElementById("episode-controls").style.display = "flex";
  document.getElementById("onShow").style.display = "none";
  document.getElementById("backToShows").style.display = "block"; // Show back link
  document.getElementById("searchCounter").style.display = "block";
}


//  ----------------------- Helper Function------------------------

/**
 * Pads a number with leading zeros to ensure it's at least 2 digits
 * @param {number} num - Number to pad
 * @returns {string} Padded number as string (e.g., 1 becomes "01")
 */
function padNumber(num) {
  return num.toString().padStart(2, "0");
}

/**
 * Formats season and episode numbers into standard TV format (e.g., S01E05)
 * @param {number} season - Season number
 * @param {number} number - Episode number
 * @returns {string} Formatted episode code
 */
function formatEpisodeCode(season, number) {
  return `S${padNumber(season)}E${padNumber(number)}`;
}

function formatShowCode(number) {
  return `${padNumber(number)}`;
}

/**
 * Updates the search counter display to show current results vs total
 * @param {Array} episodeList - Current filtered list of episodes
 * @param {number} episodeCounter - Total number of episodes available
 */
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

//  ----------------------- render Function------------------------

/**
 * Filters episodes based on search term in name or summary
 * @param {Array} allEpisodes - Array of all episodes to search through
 * @param {string} searchValue - Search term to filter by
 */
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

/**
 * Renders episode cards on the page using the template
 * Creates cards for each episode with image, title, episode code, summary, and link
 * @param {Array} listOfApi - Array of episode objects to display
 */
function makePageForEpisodes(listOfApi) {
  const containerEpisode = document.getElementById("episode-container");
  const templateEpisode = document.getElementById("episode-template");

  // Update search counter
  searchCounter(listOfApi, episodeCounter, "episodes");

  // Clear container before rendering
  containerEpisode.innerHTML = "";

  // Handle case where no results were found
  if (listOfApi.length === 0) {
    containerEpisode.innerHTML = "<p>No episodes match your search.</p>";
    return;
  }

  // Render each episode card
  listOfApi.forEach((eachRecord) => {
    const clone = templateEpisode.content.cloneNode(true);

    // Image null check
    const img = clone.querySelector("img");
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

    const summaryEl = clone.querySelector(".summary");
    summaryEl.innerHTML = eachRecord.summary || "No summary available.";

  // Summary and toggle
    clone.querySelector(".summary").textContent =
      eachRecord.summary
        ? eachRecord.summary.replace(/<[^>]+>/g, "") // Remove HTML tags if present
        : "No summary available.";

    containerEpisode.append(clone);
  });
}

/**
 * Renders show cards on the page using the template
 * Creates clickable cards for each show that when clicked, loads that show's episodes
 * @param {Array} listOfShows - Array of show objects to display
 */
function makePageForShows(listOfShows) {
  const containerEpisode = document.getElementById("episode-container");
  const templateShow = document.getElementById("show-template");

  // Update search counter for shows
  searchCounter(listOfShows, allShows.length, "shows");

  // Clear container before rendering
  containerEpisode.innerHTML = "";

  // Handle case where no shows were found
  if (listOfShows.length === 0) {
    containerEpisode.innerHTML = "<p>No shows available.</p>";
    return;
  }

  // Render each show card
  listOfShows.forEach((eachShow) => {
    const clone = templateShow.content.cloneNode(true);

    // Image null check
    const img = clone.querySelector("img");
    if (eachShow.image && eachShow.image.medium) {
      img.src = eachShow.image.medium;
      img.alt = eachShow.name;
    } else {
      img.src = "https://via.placeholder.com/250x140?text=No+Image";
      img.alt = "No image available";
    }

    clone.querySelector(".title").textContent = eachShow.name;

    const rating =
      eachShow.rating && eachShow.rating.average
        ? eachShow.rating.average
        : "N/A";
    clone.querySelector(".rating").textContent = `⭐️ ${rating}`;

    clone.querySelector(
      ".genres"
    ).textContent = `Genres: ${eachShow.genres.join(", ")}`;

    const status = eachShow.status || "Unknown";
    const runtime = eachShow.runtime ? `${eachShow.runtime} min` : "N/A";
    clone.querySelector(
      ".status-runtime"
    ).textContent = `${status} · ${runtime}`;

    // Summary and toggle
    clone.querySelector(".summary").textContent =
      eachShow.summary
        ? eachShow.summary.replace(/<[^>]+>/g, "") // Remove HTML tags if present
        : "No summary available.";

    // Add click event to make show cards clickable
    const selectThisShow = document.createElement("button");
    selectThisShow.className = "selectThisShow";
    selectThisShow.textContent = "select This Show";
    selectThisShow.addEventListener("click", function () {
      document.getElementById("dDBAllShows").value = eachShow.id;
      fetchEpisodesByShowId(eachShow.id);
      switchToEpisodesView();
    });
    clone.querySelector(".card").appendChild(selectThisShow);

    containerEpisode.append(clone);
  });
}

/**
 * Populates the episode dropdown with all episodes from current show
 * Creates options with formatted episode codes and names
 * @param {Array} allEpisodes - Array of episode objects to populate dropdown with
 */
function dropBoxFill(allEpisodes) {
  const dropDBox = document.getElementById("dropDownBoxFill");
  dropDBox.innerHTML = "";

  // Show All Episodes
  dropDBox.add(new Option("Show All Episodes", "all"));

  allEpisodes.forEach((episode) => {
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

/**
 * Populates the show dropdown with all available shows
 * Creates options with show names, sorted alphabetically
 * @param {Array} allShows - Array of show objects to populate dropdown with
 */
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
// Add this after your setup() function or at the end of the file:
document.getElementById("backToShows").addEventListener("click", function (e) {
  e.preventDefault();
  switchToShowsView();
});