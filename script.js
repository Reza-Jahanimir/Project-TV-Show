// Public Vars
let episodeCounter = 0;
let searchValue = "";
let allEpisodes = [];

async function setup() {
  // Create loading message
  const waitLoadMessage = document.createElement("p");
  waitLoadMessage.id = "status-message";
  waitLoadMessage.textContent = "Loading episodes...";
  document.body.prepend(waitLoadMessage);

  try {
    const res = await fetch("https://api.tvmaze.com/shows/82/episodes")
    
    if (!res.ok) {
      throw new Error("Network error");
    }

    const data = await res.json();
    allEpisodes = data;

    // Remove loading message
    const statusMessage = document.getElementById("status-message");
    if (statusMessage) {
      statusMessage.remove();
    }

    // Initialize UI
    dropBoxFill(allEpisodes);
    episodeCounter = allEpisodes.length;

    // Apply current search filter
    const filtered = searchValue
      ? allEpisodes.filter((episode) => {
          const name = episode.name.toLowerCase();
          const summary = episode.summary
            ? episode.summary.toLowerCase()
            : "";
          const search = searchValue.toLowerCase();
          return name.includes(search) || summary.includes(search);
        })
      : allEpisodes;

    makePageForEpisodes(filtered);
    
  } catch (err) {
    console.error("Fetch error:", err);
    const statusMessage = document.getElementById("status-message");
    if (statusMessage) {
      statusMessage.textContent =
        "⚠️ Failed to load episodes. Please try again later.";
    }
  }
}

function padNumber(num) {
  return num.toString().padStart(2, "0");
}

function formatEpisodeCode(season, number) {
  return `S${padNumber(season)}E${padNumber(number)}`;
}

function makePageForEpisodes(episodeList) {
  const containerEpisode = document.getElementById("episode-container");
  const templateEpisode = document.getElementById("episode-template");
  const searchCounter = document.getElementById("searchCounter");

  searchCounter.textContent = `Displaying ${episodeList.length}/${episodeCounter} episode(s)`;
  containerEpisode.innerHTML = "";

  episodeList.forEach((episode) => {
    const clone = templateEpisode.content.cloneNode(true);
    clone.querySelector("img").src = episode.image.medium;
    clone.querySelector("img").alt = episode.name;
    clone.querySelector(".title").textContent = episode.name;
    clone.querySelector(".code").textContent = formatEpisodeCode(
      episode.season,
      episode.number
    );
    clone.querySelector(".summary").innerHTML = episode.summary;
    clone.querySelector(".link").href = episode.url;

    containerEpisode.append(clone);
  });
}
//
function handleSearchEvent(event) {
  searchValue = event.target.value;
  setup();
}

// Id is a "value" for Option ==> episode.id
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

//Search on Drop Down Box
function handleDropDownChange(event) {
  const selectedId = event.target.value;

  if (selectedId === "all") {
    setup(); 
  } else {
    const selectedEpisode = allEpisodes.filter((ep) => ep.id == selectedId);
    makePageForEpisodes(selectedEpisode); 
  }
}

document
  .getElementById("searchInput")
  .addEventListener("keyup", handleSearchEvent);
document
  .getElementById("dropDownBoxFill")
  .addEventListener("change", handleDropDownChange);

window.onload = setup;
