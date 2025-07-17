let currentIndex = 0;
let playlist = [];

let autoDelayDur = 15;
let autoPlayDelay = null;
let scrollTimer = null;
let scrollPosFloat = 0;
let scrollStep = 0;
let wasScrolling = false;

let currentFontSize = 18;
let currentLineHeight = 1.6;
const titleBar = document.getElementById('titleBar');
const container = document.getElementById('lyricsPanel');
const scrollBar = document.getElementById('customScrollbar');
const dropDown = document.getElementById('playlistDropdown');
const lyricsPanel = document.getElementById('lyricsPanel');
const panelStyle = lyricsPanel.style;
    
// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  console.log('App initialized');
  initializeClock();
  setupFileInput();
  setupInteractionHandlers();
  populatePlaylistDropdown(true);
  initializeScrollbar();
  
  // Make functions globally available
  window.loadSong = loadSong;
  window.currentIndex = currentIndex;
  window.startAutoScroll = startAutoScroll;
  window.updateScrollbar = updateScrollbar;
  window.cancelAutoScroll = cancelAutoScroll;
  window.toggleInfoPanel = toggleInfoPanel;
});

function updateScrollbar() {
  const container = document.getElementById('lyricsPanel');
  const scrollbar = document.getElementById('customScrollbar');

  const contentHeight = container.scrollHeight;
  const visibleHeight = container.clientHeight;
  const scrollTop = container.scrollTop;

  const scrollbarHeight = (visibleHeight / contentHeight) * visibleHeight;
  const scrollbarTop = 55 + (scrollTop / contentHeight) * visibleHeight;

  scrollbar.style.height = `${scrollbarHeight}px`;
  scrollbar.style.top = `${scrollbarTop}px`;
}

function initializeScrollbar() {
  lyricsPanel.addEventListener('scroll', updateScrollbar);
}

function initializeClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit'
        });
      document.querySelectorAll('.clock')
        .forEach(clock => {
        clock.textContent = timeString;
        });
  }
    updateClock();
    setInterval(updateClock, 1000);
}

function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('File input setup complete');
    } else {
        console.error('File input element not found');
    }
  
    function handleFileSelect(event) {
      const file = event.target.files[0];
      console.log('File selected:', file);
  
      if (!file) {
          console.log('No file selected');
          return;
      }
  
      if (!file.name.toLowerCase()
          .endsWith('.csv')) {
          alert('Please select a CSV file');
          return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
          const csv = e.target.result;
          console.log('CSV content loaded:', csv.substring(0, 200) + '...');
          parsePlaylist(csv);
      };
  
      reader.onerror = function(e) {
          console.error('Error reading file:', e);
          alert('Error reading file');
      };
  
      reader.readAsText(file);
  }
  function parsePlaylist(csvData) {
  console.log('Parsing CSV data...');

  if (typeof Papa === 'undefined') {
      console.error('PapaParse library not loaded');
      alert('CSV parser not available. Please refresh the page.');
      return;
  }

    Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        transformHeader: function(header) {
            // Normalize header names (remove spaces, lowercase)
            return header.trim()
                .toLowerCase();
        },
        complete: function(results) {
            console.log('Parse results:', results);
  
            if (results.errors && results.errors.length > 0) {
                console.error('Parse errors:', results.errors);
            }
  
            if (results.data && results.data.length > 0) {
                playlist = results.data.filter(row => {
                    // Filter out empty rows
                    return Object.values(row)
                        .some(value => value && value.trim() !== '');
                });
  
                console.log('Parsed playlist:', playlist);
  
                if (playlist.length > 0) {
                    populatePlaylistDropdown();
                    loadSong(0); // Auto-load first song
                } else {
                    alert('No valid songs found in CSV file');
                }
            } else {
                console.error('No data found in CSV');
                alert('No data found in CSV file');
            }
        },
        error: function(error) {
            console.error('Papa Parse error:', error);
            alert('Error parsing CSV file: ' + error.message);
        }
    });
  }
}

function populatePlaylistDropdown(addLoadFileButton = false) {
    if (addLoadFileButton){
      makePlaylistItem('LOAD PLAYLIST', -1);
      return;
    }
    playlist.forEach((song, index) => {
      const title = song.title || song.name || song.song || song.songname || `Song ${index}`;
      makePlaylistItem (title, index);
    });
    function makePlaylistItem (title, index){
    const item = document.createElement('div');
    item.textContent = title;
    item.className = 'playlist-item';
    item.onclick = () => loadSong(index);
    dropDown.appendChild(item, index);
  }
}

function loadSong(index) {
  console.log(index);
  cancelAutoScroll();
  if (index === -1){
    document.getElementById('fileInput').click();
    return;
  }  
    dropDown.style.display = 'none';
    if (index < 0 || index >= playlist.length) {
        console.log('Invalid song index:', index);
        return;
    }
    currentIndex = index;
    window.currentIndex = currentIndex; // Update global reference
    const song = playlist[currentIndex];
    console.log('Loading song:', song);

    // Show gradients when song is loaded
    lyricsPanel.classList.add('song-loaded');

    // Update lyrics panel
    lyricsPanel.innerHTML = formatChordProSong(song);

    lyricsPanel.scrollTo({ top: 0, behavior: 'smooth' });

    dropDown.classList.remove('show');
    updateScrollbar();
    updateSongInfo(song);
    updatePlaylistHighlight();

    function formatChordProSong(song) {
      // Try different possible column names for lyrics
      const lyrics = song.lyrics || song.content || song.text || song.chordpro || song.song_content;
  
      if (!lyrics) {
          return 'No lyrics available for this song';
      }
  
      let formatted = lyrics;
  
      // Replace chord notation [C] with styled spans - preserve line breaks
      formatted = formatted.replace(/\[([^\]]+)\]/g, '<span class="chord">$1</span>');
  
      // Handle different line break formats
      formatted = formatted.replace(/\\n/g, '\n'); // Handle escaped newlines
  
      // Split into sections and add alternating backgrounds
      const sections = formatted.split(/\n\s*\n/); // Split on double line breaks
      let result = '';
  
      sections.forEach((section, index) => {
          const sectionClass = index % 2 === 0 ? 'section-light' : 'section-dark';
          let sectionContent = section.trim();
  
          // Check if section starts with a label like {verse}, {chorus}, etc.
          const labelMatch = sectionContent.match(/^\{([^}]+)\}/i);
          if (labelMatch) {
              let label = labelMatch[1].toUpperCase();
              // Remove "C: " prefix if present
              label = label.replace(/^C:\s*/, '');
              sectionContent = sectionContent.replace(/^\{[^}]+\}\s*/, '');
              sectionContent = `<div class="section-header">${label}</div>${sectionContent}`;
          };
  
          sectionContent = sectionContent.replace(/\n/g, '<br>');
          result += `<div class="lyrics-section ${sectionClass}">${sectionContent}</div>`;
      });
  
      return result || formatted.replace(/\n/g, '<br>');
  }

  function updateSongInfo(song) {
    const titleDisplay = document.getElementById('titlebarTitle');

    // Try different possible column names
    const title = song.title || song.name || song.song || song.songname || 'Unknown Title';
    const capo = song.capo || song.capo_fret || '';
    const chords = song.chords || song.chord_progression || song.chord_sequence || '';
    const key = song.key || song.songkey || song.chord_key || '';
    const tempo = song.tempo || song.bpm || song.speed || '';
    const duration = song.duration || song.length || song.time || '';
    const nextSongIndex = playlist.indexOf(song) + 1;
    const nextTitle = (nextSongIndex < playlist.length) ?
        playlist[nextSongIndex].title : "";

    // Update title bar
    titleDisplay.textContent = title;

    let metadataHtml = '';
    if (capo) metadataHtml += `<span class="capo-info">Capo: ${capo}</span><br>`;
    if (chords) metadataHtml += `<span class="chords-info">Chords:<br>${chords}</span><br>`;
    if (key) metadataHtml += `Key: ${key}<br>`;
    if (tempo) metadataHtml += `Tempo: ${tempo}<br>`;
    if (duration) {
        const formattedDuration = formatDuration(duration);
        if (formattedDuration) metadataHtml += `Duration: ${formattedDuration}`;
    }

    let infoBoxHTML =`
      <div class="song-metadata">${metadataHtml}</div>
      <div class="song-next-info">${currentIndex + 1} of ${playlist.length}</div>`;
    if (currentIndex + 1 < playlist.length){
      infoBoxHTML +=`<div class="song-next-info" onclick="event.stopPropagation(); loadSong(currentIndex + 1);">Next: ${nextTitle}</div>`;
    }
    infoPanel.innerHTML = infoBoxHTML;
    infoPanel.classList.add('visible');
    
    function formatDuration(seconds) {
      if (!seconds || seconds === 'Unknown') return '';
  
      const numSeconds = parseInt(seconds);
      if (isNaN(numSeconds)) return '';
  
      const minutes = Math.floor(numSeconds / 60);
      const remainingSeconds = numSeconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  function updatePlaylistHighlight() {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
        item.classList.toggle('active', (index - 1) === currentIndex);
    });
  }
}

let news = document.getElementById('titlebarTitle');
function startAutoScroll(topDelayEnded = false) {
  cancelAutoScroll();
  wasScrolling = true;

  if (topDelayEnded || (lyricsPanel.scrollTop > 10)) {
    infoPanel.classList.remove('visible');
    scrollPosFloat = lyricsPanel.scrollTop;
    scrollStep = calculateScrollStep();

    scrollTimer = setInterval(() => {
      scrollPosFloat += scrollStep;
      const maxScrollTop = lyricsPanel.scrollHeight - lyricsPanel.clientHeight;
    
      if (scrollPosFloat >= maxScrollTop) {
        lyricsPanel.scrollTop = maxScrollTop;
        clearInterval(scrollTimer);
        infoPanel.classList.add('visible');
        return;
      }
      lyricsPanel.scrollTop = scrollPosFloat;
    }, 100);
    return;
  }
  
  // SONG AT BEGINNING
  const currentSong = playlist[currentIndex];
  const songTempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
  let pulseRate = (60 / parseInt(songTempo)).toString() + 's';
  titlebar.classList.add('pulse');
  titlebar.style.setProperty('--pulse-duration', pulseRate);

  autoPlayDelay = setTimeout(() => {
    startAutoScroll(true);
  }, autoDelayDur * 1000);
}

function cancelAutoScroll() {
  clearTimeout(autoPlayDelay);
  clearInterval(scrollTimer);
  autoPlayDelay = null;
  scrollTimer = null;
  titlebar.classList.remove('pulse');
}

function calculateScrollStep() {
  const container = document.getElementById('contentWrapper');
  
  const scrollDistance = lyricsPanel.scrollHeight - container.clientHeight;
  const totalDuration = window.currentSongDuration || 160;
  const remainingDuration = Math.max(0, totalDuration - autoDelayDur);
  const intervals = remainingDuration * 10; // intervals of 100ms

  const speed = intervals > 0 ? scrollDistance / intervals : 0;
  // console.log(speed);
  return speed;
}

function toggleInfoPanel() {
  const box = document.getElementById('infoPanel');
  box.classList.toggle('visible');
}
  
function setupInteractionHandlers() {

  let clickTimer = null;
  titlebar.addEventListener('click', (e) => {
    // Wait to see if it's a double-click
    if (clickTimer) return;

    clickTimer = setTimeout(() => {
      // Single click → show playlist dropdown
      dropDown.style.display = 'block';
      clickTimer = null;
    }, 250); // 250ms is a good balance for double-click detection
  });

  titlebar.addEventListener('dblclick', (e) => {
    clearTimeout(clickTimer);
    clickTimer = null;
    // Double click → show song info box
    document.getElementById('infoPanel')?.classList.add('visible');
  });
  const lyricsPanel = document.getElementById('lyricsPanel');
  let isPinching = false;
  let wasScrolling = false;
  let initialTouches = [];
  let lastTouchTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;

  // Prevent browser zoom on pinch
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('gesturechange', e => e.preventDefault());
  document.addEventListener('gestureend', e => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (e.scale !== 1) e.preventDefault();
  }, { passive: false });

  lyricsPanel.addEventListener('touchstart', (e) => {
    wasScrolling = !!(scrollTimer || autoPlayDelay);
    cancelAutoScroll();

    if (e.touches.length === 2) {
      isPinching = true;
      initialTouches = [...e.touches];
    } else {
      isPinching = false;
      lastTouchTime = Date.now();
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }
  });

  lyricsPanel.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches.length === 2) {
      const prevTouches = initialTouches;
      const currTouches = [...e.touches];
  
      const dx =
        ((currTouches[0].clientX - prevTouches[0].clientX) +
         (currTouches[1].clientX - prevTouches[1].clientX)) / 2;
      const dy =
        ((currTouches[0].clientY - prevTouches[0].clientY) +
         (currTouches[1].clientY - prevTouches[1].clientY)) / 2;
  
      adjustFontSize(dx * 0.1);
      adjustLineSpacing(-dy * 0.01);
  
      // Update for next move
      initialTouches = currTouches;
    }
  });

  lyricsPanel.addEventListener('touchend', (e) => {
    const elapsed = Date.now() - lastTouchTime;
  
    if (isPinching) {
      isPinching = false;
      if (wasScrolling) startAutoScroll(true);
      return;
    }
  
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
  
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        // Swipe left or right
        if (deltaX < 0) {
          loadSong(currentIndex + 1); // Swipe left = next
        } else {
          loadSong(currentIndex - 1); // Swipe right = previous
        }
      } else if (elapsed < 300) {
        if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
          // Vertical swipe = restart scrolling
          startAutoScroll(true);
        } else {
          // Quick tap = toggle scroll
          wasScrolling ? cancelAutoScroll() : startAutoScroll();
        }
      }
    }
  
    // news.textContent = `isPinching: ${isPinching}, wasScrolling: ${wasScrolling}`;
  });

  function adjustFontSize(delta) {
    currentFontSize += delta;
    currentFontSize = Math.max(12, Math.min(36, currentFontSize));
    panelStyle.fontSize = currentFontSize + 'px';
    scrollStep = calculateScrollStep();
  }

  function adjustLineSpacing(delta) {
    currentLineHeight += delta;
    currentLineHeight = Math.max(1.0, Math.min(3.0, currentLineHeight));
    panelStyle.lineHeight = currentLineHeight;
    scrollStep = calculateScrollStep();
  }
}
