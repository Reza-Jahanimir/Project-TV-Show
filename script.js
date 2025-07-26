//You can edit ALL of the code here
function setup() {
  const allEpisodes = getAllEpisodes();
  makePageForEpisodes(allEpisodes);
}

function padNumber(num) {
  return num.toString().padStart(2, "0");
}

// with will make S01E12
function formatEpisodeCode(season, number) {
  return `S${padNumber(season)}E${padNumber(number)}`;
}

function makePageForEpisodes(episodeList) {
  const containerEpisode = document.getElementById("episode-container");
  const templateEpisode = document.getElementById("episode-template");

  episodeList.forEach((episode) => {
    const clone = templateEpisode.content.cloneNode(true);

    clone.querySelector("img").src = episode.image.medium;
    clone.querySelector("img").alt = episode.name;
    clone.querySelector(".title").textContent = episode.name;
    clone.querySelector(".code").textContent = formatEpisodeCode(episode.season,episode.number);
    clone.querySelector(".summary").innerHTML = episode.summary;
    clone.querySelector(".link").href = episode.url;

    containerEpisode.append(clone);
  });
}

window.onload = setup;
