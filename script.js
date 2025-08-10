// ===================== APPLICATION STATE =====================

/**
 * Global state object for API data and application data
 * @type {Object}
 * @property {Array} allShows - Complete list of all fetched TV shows
 * @property {Array} allEpisodes - Episodes for the currently selected show
 * @property {Map} fetchCache - Cache for API responses to avoid duplicate requests
 * @property {number|null} currentShowId - ID of the currently selected show
 * @property {number} episodeCounter - Total count of episodes for current show
 */
const stateData = {
  allShows: [],
  allEpisodes: [],
  fetchCache: new Map(),
  currentShowId: null,
  episodeCounter: 0,
};

/**
 * State object for search and UI mode management
 * @type {Object}
 * @property {string} view - Current view mode: 'shows' or 'episodes'
 * @property {string} value - Current search query string
 */
const stateSearch = {
  view: "shows",          // 'shows' | 'episodes'
  value: "",              
};

/**
 * State object for pagination management
 * @type {Object}
 * @property {number} currentPage - Current active page number (1-based)
 * @property {number} itemsPerPage - Number of items to display per page
 * @property {number} totalPages - Total number of pages for current dataset
 * @property {Array} currentDisplayList - Current list of items being paginated
 * @property {string} currentType - Type of items being paginated: 'shows' or 'episodes'
 */
const statePagination = {
  currentPage: 1,
  itemsPerPage: 12,       
  totalPages: 1,
  currentDisplayList: [],
  currentType: "shows",   // 'shows' | 'episodes'
};

//  ----------------------- PAGINATION FUNCTIONS ------------------------

/**
 * Creates pagination controls and handles page navigation
 * 
 * This function generates a complete pagination interface including:
 * - Previous/Next navigation buttons
 * - Page number buttons (showing up to 5 pages)
 * - Items per page selector
 * - Current page indicator
 * 
 * @param {Array} items - Array of items (shows or episodes) to paginate
 * @param {string} type - Type of items being paginated ('shows' or 'episodes')
 */
function createPagination(items, type) {
  // Update pagination state
  statePagination.currentDisplayList = items;
  statePagination.totalPages = Math.ceil(items.length / statePagination.itemsPerPage);
  statePagination.currentType = type;
  
  // Get or create pagination container
  let paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    paginationContainer.className = 'pagination-container';
    
    // Insert pagination after the card container
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.parentNode.insertBefore(paginationContainer, cardContainer.nextSibling);
  }
  
  // Clear existing pagination controls
  paginationContainer.innerHTML = '';
  
  // Hide pagination if only one page or less
  if (statePagination.totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  // Create Previous button
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
  
  // Create page information display
  const pageInfo = document.createElement('span');
  pageInfo.className = 'page-info';
  pageInfo.textContent = `Page ${statePagination.currentPage} of ${statePagination.totalPages}`;
  paginationContainer.appendChild(pageInfo);
  
  // Create page number buttons (show up to 5 page numbers centered around current page)
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
  
  // Create Next button
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
  
  // Create items per page selector
  const itemsPerPageContainer = document.createElement('div');
  itemsPerPageContainer.className = 'items-per-page';
  
  const label = document.createElement('label');
  label.textContent = 'Items per page: ';
  
  const select = document.createElement('select');
  select.className = 'items-per-page-select';
  
  // Add options for different page sizes
  [6, 12, 24, 48].forEach(num => {
    const option = document.createElement('option');
    option.value = num;
    option.textContent = num;
    option.selected = num === statePagination.itemsPerPage;
    select.appendChild(option);
  });
  
  // Handle items per page change
  select.addEventListener('change', (e) => {
    statePagination.itemsPerPage = parseInt(e.target.value);
    statePagination.currentPage = 1; // Reset to first page when changing page size
    displayPage(statePagination.currentDisplayList, statePagination.currentType);
  });
  
  itemsPerPageContainer.appendChild(label);
  itemsPerPageContainer.appendChild(select);
  paginationContainer.appendChild(itemsPerPageContainer);
}

/**
 * Displays a specific page of items based on current pagination state
 * 
 * This function calculates which items should be shown on the current page,
 * renders them using the appropriate render function, updates pagination controls,
 * and smoothly scrolls to the top of the results.
 * 
 * @param {Array} items - Complete array of items to paginate
 * @param {string} type - Type of items ('shows' or 'episodes')
 */
function displayPage(items, type) {
  // Calculate which items to show on current page
  const startIndex = (statePagination.currentPage - 1) * statePagination.itemsPerPage;
  const endIndex = startIndex + statePagination.itemsPerPage;
  const pageItems = items.slice(startIndex, endIndex);
  
  // Render the appropriate type of page
  if (type === 'episodes') {
    renderEpisodesPage(pageItems);
  } else {
    renderShowsPage(pageItems);
  }
  
  // Update pagination controls
  createPagination(items, type);
  
  // Smooth scroll to top of results for better UX
  document.getElementById('cardContainer').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

//  ----------------------- RENDERING FUNCTIONS ------------------------

/**
 * Renders episode cards for the current page
 * 
 * Uses the episode template to create cards displaying:
 * - Episode image (with fallback for missing images)
 * - Episode name and season/episode code (S01E01 format)
 * - Episode summary (with HTML tags stripped)
 * - Click handler to open episode URL in new tab
 * 
 * @param {Array} episodes - Array of episode objects for current page
 */
function renderEpisodesPage(episodes) {
  console.log(episodes)
  const containerEpisode = document.getElementById("cardContainer");
  const templateEpisode = document.getElementById("episode-template");

  // Set container class for episode-specific styling
  containerEpisode.className = "container episodes";
  containerEpisode.innerHTML = "";

  // Handle empty results
  if (episodes.length === 0) {
    containerEpisode.innerHTML = "<p>No episodes match your search.</p>";
    return;
  }

  // Create card for each episode
  episodes.forEach((eachRecord) => {
    const clone = templateEpisode.content.cloneNode(true);

    // Set episode image with fallback
    const img = clone.querySelector(".epi-img");
    if (eachRecord.image && eachRecord.image.medium) {
      img.src = eachRecord.image.medium;
      img.alt = eachRecord.name;
    } else {
      img.src = "https://via.placeholder.com/250x140?text=No+Image";
      img.alt = "No image available";
    }

    // Set episode title
    clone.querySelector(".title").textContent = eachRecord.name;
    
    // Set episode code (S01E01 format) or fallback to "Show"
    clone.querySelector(".code").textContent =
      eachRecord.season !== undefined && eachRecord.number !== undefined
        ? formatEpisodeCode(eachRecord.season, eachRecord.number)
        : "Show";

    // Set episode summary with HTML tags removed
    clone.querySelector(".summary").textContent =
      eachRecord.summary
        ? eachRecord.summary.replace(/<[^>]+>/g, "")
        : "No summary available.";

    // Add click handler to open episode page in new tab
    clone.querySelector(".card-select").addEventListener("click", () => {
      window.open(eachRecord.url, '_blank')
    })

    containerEpisode.append(clone);
  });
}

/**
 * Renders show cards for the current page
 * 
 * Uses the show template to create cards displaying:
 * - Show image (with fallback for missing images)
 * - Show name, rating, genres, status, and runtime
 * - Show summary (with HTML tags stripped)
 * - "Watch Show" button to switch to episodes view
 * 
 * @param {Array} shows - Array of show objects for current page
 */
function renderShowsPage(shows) {
  const containerEpisode = document.getElementById("cardContainer");
  const templateShow = document.getElementById("show-template");

  // Set container class for show-specific styling
  containerEpisode.className = "container";
  containerEpisode.innerHTML = "";

  // Handle empty results
  if (shows.length === 0) {
    containerEpisode.innerHTML = "<p>No shows available.</p>";
    return;
  }

  // Create card for each show
  shows.forEach((eachShow) => {
    const clone = templateShow.content.cloneNode(true);

    // Set show image with fallback
    const img = clone.querySelector("img");
    if (eachShow.image && eachShow.image.medium) {
      img.src = eachShow.image.medium;
      img.alt = eachShow.name;
    } else {
      img.src = "https://via.placeholder.com/250x140?text=No+Image";
      img.alt = "No image available";
    }

    // Set show title
    clone.querySelector(".title").textContent = eachShow.name;

    // Set rating with fallback
    const rating = eachShow.rating && eachShow.rating.average ? eachShow.rating.average : "N/A";
    clone.querySelector(".rating").textContent = `rating: ⭐️ ${rating}`;

    // Set genres list
    clone.querySelector(".card-genres").textContent = `Genres: ${eachShow.genres.join(", ")}`;

    // Set show status
    const status = eachShow.status || "Unknown";
    clone.querySelector(".status").textContent = `Status: ${status}`;

    // Set runtime with fallback
    const runtime = eachShow.runtime ? `${eachShow.runtime} min` : "N/A";
    clone.querySelector(".runtime").textContent = `Run-Time: ${runtime}`;

    // Set show summary with HTML tags removed
    clone.querySelector(".summary").textContent =
      eachShow.summary
        ? eachShow.summary.replace(/<[^>]+>/g, "")
        : "No summary available.";

    // Create and add "Watch Show" button
    const selectThisShow = document.createElement("button");
    selectThisShow.className = "selectThisShow";
    selectThisShow.textContent = "▶️ Watch Show";
    selectThisShow.addEventListener("click", function () {
      // Update dropdown selection and fetch episodes
      document.getElementById("dDBAllShows").value = eachShow.id;
      stateData.currentShowId = eachShow.id;
      fetchEpisodesByShowId(eachShow.id);
      switchToEpisodesView();
    });
    clone.querySelector(".showCard").appendChild(selectThisShow);

    containerEpisode.append(clone);
  });
}

//  ----------------------- MAIN PAGE GENERATION FUNCTIONS ------------------------

/**
 * Creates paginated episode page and updates search counter
 * 
 * This is the main function for displaying episodes. It resets pagination
 * to page 1, updates the search counter, and displays the first page.
 * 
 * @param {Array} listOfApi - Array of episode objects to display
 */
function makePageForEpisodes(listOfApi) {
  statePagination.currentPage = 1; // Reset to first page
  searchCounter(listOfApi, stateData.episodeCounter, "episodes");
  displayPage(listOfApi, "episodes");
}

/**
 * Creates paginated show page and updates search counter
 * 
 * This is the main function for displaying shows. It resets pagination
 * to page 1, updates the search counter, and displays the first page.
 * 
 * @param {Array} listOfShows - Array of show objects to display
 */
function makePageForShows(listOfShows) {
  statePagination.currentPage = 1; // Reset to first page
  searchCounter(listOfShows, stateData.allShows.length, "shows");
  displayPage(listOfShows, "shows");
}

//  ----------------------- API FETCH FUNCTIONS ------------------------

/**
 * Fetches data from URL with caching to avoid duplicate requests
 * 
 * This function implements a simple in-memory cache to store API responses.
 * If data has been previously fetched, it returns the cached version.
 * Otherwise, it fetches from the network and caches the result.
 * 
 * @param {string} url - The API endpoint URL to fetch from
 * @returns {Promise<Object>} Promise resolving to the JSON data
 * @throws {Error} Throws error if fetch fails or response is not ok
 */
async function fetchWithCache(url) {
  // Check if data is already in cache
  if (stateData.fetchCache.has(url)) {
    console.log("Using cache for:", url);
    return stateData.fetchCache.get(url);
  }

  // Fetch from network if not cached
  console.log("Fetching from network:", url);
  try {
    const res = await fetch(url);
    console.log("Response status:", res.status);
    if (!res.ok) throw new Error(` Failed to fetch: ${url}`);
    const data = await res.json();
    console.log("Fetched data length:", data.length);
    
    // Store in cache for future use
    stateData.fetchCache.set(url, data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

/**
 * Fetches all TV shows from TVMaze API across multiple pages
 * 
 * The TVMaze API returns shows in pages of ~250 shows each. This function
 * fetches multiple pages to get a comprehensive list of shows. It stops
 * when a page returns no data or the maximum page limit is reached.
 * 
 * @param {number} maxPages - Maximum number of pages to fetch (default: 10)
 * @returns {Promise<Array>} Promise resolving to array of show objects sorted by name
 */
async function fetchAllShows(maxPages = 10) {
  let all = [];

  /**
   * Recursive function to fetch a single page of shows
   * @param {number} page - Page number to fetch (0-based)
   */
  async function getPage(page = 0) {
    const url = `https://api.tvmaze.com/shows?page=${page}`;
    try {
      const data = await fetchWithCache(url);
      // Stop if no data returned or data is not an array
      if (!Array.isArray(data) || data.length === 0) return;
      
      all.push(...data);
      
      // Fetch next page if under limit
      if (page + 1 < maxPages) await getPage(page + 1);
    } catch (err) {
      console.error("Failed fetching show page", page, err);
    }
  }

  await getPage(0);
  
  // Sort shows alphabetically by name
  return all.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

/**
 * Fetches all episodes for a specific show by show ID
 * 
 * This function displays a loading message, fetches episodes from the API,
 * updates the global state, populates the episode dropdown, and displays
 * the episodes page. It also handles errors gracefully.
 * 
 * @param {number} showId - The TVMaze show ID to fetch episodes for
 */
function fetchEpisodesByShowId(showId) {
  stateData.currentShowId = showId;
  
  // Show loading message
  const waitLoadMessage = document.createElement("p");
  waitLoadMessage.id = "status-message";
  waitLoadMessage.textContent = "Loading episodes...";
  document.body.prepend(waitLoadMessage);

  // Fetch episodes from API
  fetch(`https://api.tvmaze.com/shows/${showId}/episodes`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load episodes");
      return res.json();
    })
    .then((episodes) => {
      // Update global state
      stateData.allEpisodes = episodes;
      stateData.episodeCounter = episodes.length;

      // Remove loading message
      const msg = document.getElementById("status-message");
      if (msg) msg.remove();

      // Update UI with episodes
      dropBoxFill(episodes);
      makePageForEpisodes(episodes);
    })
    .catch((err) => {
      console.error("Error:", err);
      // Show error message
      const msg = document.getElementById("status-message");
      if (msg) {
        msg.textContent = "⚠️ Failed to load episodes. Please try again later.";
      }
    });
}

//  ----------------------- APPLICATION SETUP ------------------------

/**
 * Main application setup function
 * 
 * This function initializes the entire application:
 * 1. Fetches all TV shows from the API
 * 2. Populates the shows dropdown
 * 3. Switches to shows view
 * 4. Sets up all event listeners for user interactions
 * 
 * Called automatically when the page loads.
 */
async function setup() {
  // Initialize application with shows data
  stateData.allShows = await fetchAllShows();
  dropBoxAllShows(stateData.allShows);
  switchToShowsView(stateData.allShows);
  console.log(stateData.allShows);

  // Set up event listeners for user interactions
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

//  ----------------------- EVENT HANDLER FUNCTIONS ------------------------

/**
 * Handles changes to the show dropdown selection
 * 
 * When user selects a show from the dropdown, this function either:
 * - Shows all shows if "allShows" is selected
 * - Fetches and displays episodes for the selected show
 * 
 * @param {Event} event - The change event from the dropdown
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
 * Handles changes to the episode dropdown selection
 * 
 * When user selects an episode from the dropdown, this function either:
 * - Shows all episodes if "all" is selected
 * - Shows only the selected episode
 * 
 * @param {Event} event - The change event from the dropdown
 */
function handleEpisodeDropDownChange(event) {
  const selectedId = event.target.value;

  if (selectedId === "all") {
    makePageForEpisodes(stateData.allEpisodes);
  } else {
    // Filter to show only the selected episode
    const selectedEpisode = stateData.allEpisodes.filter((ep) => ep.id == selectedId);
    makePageForEpisodes(selectedEpisode);
  }
}

/**
 * Handles input events for show search functionality
 * 
 * Searches through shows by name, summary, and genres as the user types.
 * Shows all shows when search is empty, filtered results when searching.
 * Only processes searches when in "shows" view.
 * 
 * @param {Event} event - The input event from the search field
 */
function handleShowSearchEvent(event) {
  const searchValue = event.target.value.toLowerCase().trim();
  stateSearch.value = searchValue;

  // Only process if we're in shows view
  if (stateSearch.view === "shows") {
    if (searchValue === "") {
      // Show all shows when search is empty
      makePageForShows(stateData.allShows);
    } else {
      // Filter shows by name, summary, and genres
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

/**
 * Handles input events for episode search functionality
 * 
 * Searches through episodes by name and summary as the user types.
 * Shows all episodes when search is empty, filtered results when searching.
 * Also resets episode dropdown to "all" when searching.
 * Only processes searches when in "episodes" view.
 * 
 * @param {Event} event - The input event from the search field
 */
function handleEpisodeSearchEvent(event) {
  const searchValue = event.target.value.toLowerCase().trim();
  stateSearch.value = searchValue;

  // Only process if we're in episodes view
  if (stateSearch.view === "episodes") {
    if (searchValue === "") {
      // Reset dropdown and show all episodes when search is empty
      document.getElementById("dropDownBoxFill").value = "all";
      makePageForEpisodes(stateData.allEpisodes);
    } else {
      // Search and filter episodes
      searchEpisodes(stateData.allEpisodes, searchValue)
    }
  }
}

// ----------------------- VIEW MANAGEMENT FUNCTIONS ------------------------

/**
 * Switches the application to shows view
 * 
 * This function manages the UI state transition to shows view by:
 * - Hiding episode-specific controls
 * - Showing show-specific controls and search
 * - Hiding the "back to shows" button
 * - Displaying all shows
 */
function switchToShowsView() {
  stateSearch.view = "shows";
  document.getElementById("episode-controls").style.display = "none";
  document.getElementById("onShow").style.display = "block";
  document.getElementById("showSearchInput").style.display = "block";
  document.querySelector('label[for="showSearchInput"]').style.display = "block";
  document.getElementById("backToShows").style.display = "none";
  makePageForShows(stateData.allShows);
}

/**
 * Switches the application to episodes view
 * 
 * This function manages the UI state transition to episodes view by:
 * - Showing episode-specific controls
 * - Hiding show-specific controls
 * - Showing the "back to shows" button
 * - Showing the search counter
 */
function switchToEpisodesView() {
  stateSearch.view = "episodes";
  document.getElementById("episode-controls").style.display = "flex";
  document.getElementById("onShow").style.display = "none";
  document.getElementById("backToShows").style.display = "block";
  document.getElementById("searchCounter").style.display = "block";
}

//  ----------------------- UTILITY HELPER FUNCTIONS ------------------------

/**
 * Pads a number with leading zeros to ensure 2-digit format
 * 
 * @param {number} num - Number to pad
 * @returns {string} Zero-padded string (e.g., 1 becomes "01")
 */
function padNumber(num) {
  return num.toString().padStart(2, "0");
}

/**
 * Formats season and episode numbers into standard TV format (S01E01)
 * 
 * @param {number} season - Season number
 * @param {number} number - Episode number
 * @returns {string} Formatted episode code (e.g., "S01E01")
 */
function formatEpisodeCode(season, number) {
  return `S${padNumber(season)}E${padNumber(number)}`;
}

/**
 * Formats a show number with zero-padding
 * 
 * @param {number} number - Show number to format
 * @returns {string} Zero-padded show number
 */
function formatShowCode(number) {
  return `${padNumber(number)}`;
}

/**
 * Updates the search counter display to show current results
 * 
 * @param {Array} list - Current filtered/displayed items
 * @param {number} total - Total available items
 * @param {string} type - Type of items ("shows" or "episodes")
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

/**
 * Searches and filters episodes based on search criteria
 * 
 * Filters episodes by name and summary content, then displays the results.
 * If no search value provided, shows all episodes.
 * 
 * @param {Array} allEpisodes - Complete array of episodes to search through
 * @param {string} searchValue - Search query string
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
 * Populates the episode dropdown with all episodes for current show
 * 
 * Creates options for each episode in the format "S01E01 - Episode Name"
 * with "Show All Episodes" as the first option.
 * 
 * @param {Array} episodes - Array of episode objects to populate dropdown with
 */
function dropBoxFill(episodes) {
  const dropDBox = document.getElementById("dropDownBoxFill");
  dropDBox.innerHTML = "";

  // Add "show all" option first
  dropDBox.add(new Option("Show All Episodes", "all"));

  // Add option for each episode
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

/**
 * Populates the main shows dropdown with all available shows
 * 
 * Creates options for each show with "Show All Shows" as the first option.
 * Used for quick navigation between different shows.
 * 
 * @param {Array} allShows - Array of show objects to populate dropdown with
 */
function dropBoxAllShows(allShows) {
  const dropDBoxShows = document.getElementById("dDBAllShows");
  dropDBoxShows.innerHTML = "";

  // Add "show all" option first
  dropDBoxShows.add(new Option("Show All Shows", "allShows"));

  // Add option for each show
  allShows.forEach((show) => {
    dropDBoxShows.add(new Option(show.name, show.id));
  });
}

// ----------------------- APPLICATION INITIALIZATION ------------------------

/**
 * Initialize the application when the page loads
 * 
 * This ensures that all DOM elements are available before running setup.
 */
window.onload = setup;