let currentIndex = 0;
let playlist = [];
let autoDelayDur = 12;
let autoScrollDelay = null;
let scrollInterval = null;
let scrollStep = 0;
let scrollPosFloat = 0;
let currentFontSize = 18;
let currentLineHeight = 1.6;
let playlistName = 'Playlist';
let currentTransposition = 0;
let originalKey = '';
setThemeColor('#3498db');  

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  console.log('App initialized');
  initializeClock();
  setupFileInput();
  setupInteractionHandlers();
  initializeScrollbar();
  initSettings();
  
  // Make functions globally available
  window.loadSong = loadSong;
  window.startAutoScroll = startAutoScroll;
  window.currentIndex = currentIndex;
  window.updateScrollbar = updateScrollbar;
  window.hideMe = hideMe;
});

function initSettings() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const colorPicker = document.getElementById('colorPickerBtn');
  const panel = document.getElementById('lyricsPanel').style;

  if (!themeToggleBtn) {
    console.error('Theme toggle button not found');
    return;
  }
  if (!colorPicker) {
    console.error('Color picker element not found');
    return;
  }

  // Initialize theme mode from localStorage
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }

  // Initialize theme color from localStorage
  const savedColor = localStorage.getItem('theme-color');
  if (savedColor) {
    setThemeColor(savedColor);
    colorPicker.value = savedColor;
  }

  // --- FONT SIZE & LINE HEIGHT ---
  const savedFontSize = parseInt(localStorage.getItem('font-size'), 10);
  if (!isNaN(savedFontSize)) {
    currentFontSize = savedFontSize;
    panel.fontSize = currentFontSize + 'px';
  }

  const savedLineHeight = parseFloat(localStorage.getItem('line-height'));
  if (!isNaN(savedLineHeight)){
    currentLineHeight = savedLineHeight;
    panel.lineHeight = currentLineHeight;
  }

  const savedPlaylist = localStorage.getItem('saved-playlist');
  if (savedPlaylist === null) {
    console.log("No playlist saved yet.");
    populatePlaylistDropdown();
  } else {
    console.log("Saved playlist:", playlist);
    parsePlaylist(savedPlaylist);
    loadSong(0);
  }

  // Theme toggle button click (ONLY HERE)
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });

  // Color picker input change
  colorPicker.addEventListener('input', (e) => {
    const newColor = e.target.value;
    setThemeColor(newColor);
    localStorage.setItem('theme-color', newColor);
  });
}

function setThemeColor(color) {
  document.body.style.setProperty('--theme-color', color);
}

function updateScrollbar() {
  const container = document.getElementById('lyricsPanel');
  const scrollbar = document.getElementById('customScrollbar');
  const songInfoBox = document.getElementById('songInfoBox');

  const contentHeight = container.scrollHeight;
  const visibleHeight = container.clientHeight;
  const scrollTop = container.scrollTop;

  const scrollbarHeight = (visibleHeight / contentHeight) * visibleHeight;
  const scrollbarTop = (scrollTop / contentHeight) * visibleHeight;

  scrollbar.style.height = `${scrollbarHeight}px`;
  scrollbar.style.top = `${scrollbarTop}px`;
}

function initializeScrollbar() {
  const container = document.getElementById('lyricsPanel');
  const scrollbar = document.getElementById('customScrollbar');
  container.addEventListener('scroll', updateScrollbar);
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
        localStorage.setItem('saved-playlist', csv);
        parsePlaylist(csv);
        loadSong(0);
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

function populatePlaylistDropdown () {
  document.querySelectorAll('#playlistDropdown .playlist-item').forEach(el => el.remove());
  makePlaylistItem('LOAD NEW PLAYLIST', -1);
  
  playlist.forEach((song, index) => {
    const title = song.title || song.name || song.song || song.songname || `Song ${index}`;
    makePlaylistItem (title, index);
  });
  function makePlaylistItem (title, index){
    const dropdown = document.getElementById('playlistDropdown');
    const item = document.createElement('div');
    item.textContent = title;
    item.className = 'playlist-item';
    index === -1 ? item.classList.add('loadPlaylistBtn') : null ;
    item.onclick = () => loadSong(index);
    dropdown.appendChild(item, index);
  }
}

function showPLaylist() {
  document.getElementById('playlistDropdown').style.display = 'block';
}

function loadSong(index) {
  console.log(index);
  cancelAutoScroll();
  if (index === -1){
    document.getElementById('fileInput').click();
    return;
  }  
    document.getElementById('playlistDropdown').style.display = 'none';
    if (index < 0 || index >= playlist.length) {
        console.log('Invalid song index:', index);
        return;
    }
    currentIndex = index;
    window.currentIndex = currentIndex; // Update global reference
    const song = playlist[currentIndex];
    console.log('Loading song:', song);

    // Show gradients when song is loaded
    const lyricsPanel = document.getElementById('lyricsPanel');
    lyricsPanel.classList.add('song-loaded');

    // Update lyrics panel
    lyricsPanel.innerHTML = formatChordProSong(song);

    // lyricsPanel.scrollTo({ top: 0, behavior: 'smooth' });
    lyricsPanel.scrollTop = 0;


    document.getElementById('playlistDropdown')
        .classList.remove('show');
    updateScrollbar();
    updateSongInfo(song);
    updatePlaylistHighlight();
}

function startAutoScroll(topDelayEnded = false) {
  console.log('startAutoScroll: ', topDelayEnded);
  cancelAutoScroll();
  const lyricsPanel = document.getElementById('lyricsPanel');
  
  // Start scrolling immediately if delay already ended or manually triggered
  if (topDelayEnded || lyricsPanel.scrollTop > 10) {
    songInfoBox.style.display = 'none';
    scrollPosFloat = lyricsPanel.scrollTop;
    scrollStep = calculateScrollStep();
    scrollInterval = setInterval(() => {
      scrollPosFloat += scrollStep;
      lyricsPanel.scrollTop = Math.round(scrollPosFloat);
      if (lyricsPanel.scrollTop + lyricsPanel.clientHeight >= lyricsPanel.scrollHeight) {
        songInfoBox.style.display = 'block';
        cancelAutoScroll();
      }
    }, 100);
    return;
  }
  // SONG AT BEGINNING - show tempo pulse and delay
  const titlebar = document.getElementById('titlebar');
  const currentSong = playlist[currentIndex];
  const songTempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
  let pulseRate = (60 / parseInt(songTempo)).toString() + 's';
  titlebar.classList.add('pulse');
  titlebar.style.setProperty('--pulse-duration', pulseRate);
  
  autoScrollDelay = setTimeout(() => {
      startAutoScroll(true);
    }, autoDelayDur * 1000);
}

function calculateScrollStep() {
  const container = document.getElementById('contentWrapper');
  const content = document.getElementById('lyricsPanel');
  if (!container || !content) return 0;

  const scrollDistance = content.scrollHeight - container.clientHeight;

  const totalDuration = window.currentSongDuration || 160;
  const remainingDuration = Math.max(0, totalDuration - autoDelayDur);

  const intervals = remainingDuration * 10; // intervals of 100ms

  const speed = intervals > 0 ? scrollDistance / intervals : 0;
  console.log(speed);
  return speed;
}

function cancelAutoScroll() {
  clearTimeout(autoScrollDelay);
  clearInterval(scrollInterval);
  autoScrollDelay = null;
  scrollInterval = null;
  titlebar.classList.remove('pulse');
  songInfoBox.style.display = 'block';
}

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
        }

        sectionContent = sectionContent.replace(/\n/g, '<br>');
        result += `<div class="lyrics-section ${sectionClass}">${sectionContent}</div>`;
    });

    return result || formatted.replace(/\n/g, '<br>');
}

function formatDuration(seconds) {
    if (!seconds || seconds === 'Unknown') return '';

    const numSeconds = parseInt(seconds);
    if (isNaN(numSeconds)) return '';

    const minutes = Math.floor(numSeconds / 60);
    const remainingSeconds = numSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateSongInfo(song) {
    const titleDisplay = document.getElementById('titlebarTitle');

    // Try different possible column names
    const title = song.title || song.name || song.song || song.songname || 'Unknown Title';
    const capo = song.capo || song.capo_fret || '';
    const chords = song.chords || song.chord_progression || song.chord_sequence || '';
    console.log(chords);
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
    if (tempo) metadataHtml += `Tempo: ${tempo}<br>`;
    if (duration) {
        const formattedDuration = formatDuration(duration);
        if (formattedDuration) metadataHtml += `Duration: ${formattedDuration}`;
    }

    originalKey = key;
    currentTransposition = 0;
    const displayKey = originalKey ? transposeNote(originalKey, currentTransposition) : '';

    let transposeHTML = '';
    if (originalKey) {
      transposeHTML = `
        <div class="transpose-section">
          <div style="font-size: 12px; color: #aaa;">KEY:</div>
          <div class="transpose-controls">
            <button class="transpose-arrow" id="upBtn" aria-label="Transpose up">▲</button>
            <div class="transpose-key">${displayKey}</div>
            <button class="transpose-arrow" id="downBtn" aria-label="Transpose down">▼</button>
          </div>
        </div>
      `;
    }

    songInfoBox.innerHTML = `${transposeHTML}
        <div class="song-metadata">${metadataHtml}</div>
        <div class="song-next-info">${currentIndex + 1} of ${playlist.length}</div>
        <div class="song-next-info" onclick="loadSong(currentIndex + 1)">Next: ${nextTitle}</div>`;
    songInfoBox.classList.add('visible');

     if (originalKey) {
      document.getElementById('upBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        transposeUp();
      }, { passive: false });

      document.getElementById('downBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        transposeDown();
      }, { passive: false });
    }

    document.querySelector(".song-next-info").addEventListener("click", () => {
      loadSong(currentIndex + 1);
    });
}

function updatePlaylistHighlight() {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
        item.classList.toggle('active', (index - 1) === currentIndex);
    });
}

function hideMe(el) {
  el.classList.remove('visible');
}

const noteSequence = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function transposeNote(note, semitones) {
  const parts = note.match(/^([A-G]#?)(.*)$/);
  if (!parts) return note;

  const baseNote = parts[1];
  const modifier = parts[2];
  const index = noteSequence.indexOf(baseNote);

  if (index === -1) return note;

  const newIndex = (index + semitones + 120) % 12;
  return noteSequence[newIndex] + modifier;
}

function transposeUp() {
  currentTransposition++;
  transposeChords();
  updateTransposedKey();
}

function transposeDown() {
  currentTransposition--;
  transposeChords();
  updateTransposedKey();
}

function updateTransposedKey() {
  const displayKey = originalKey ? transposeNote(originalKey, currentTransposition) : '';
  const keyElement = document.querySelector('.transpose-key');
  if (keyElement) {
    keyElement.textContent = displayKey;
  }
}

function transposeChords() {
  const lyricsPanel = document.getElementById('lyricsPanel');
  const song = playlist[currentIndex];

  if (!song) return;

  const lyrics = song.lyrics || song.content || song.text || song.chordpro || song.song_content;
  if (!lyrics) return;

  let formatted = lyrics;
  formatted = formatted.replace(/\[([^\]]+)\]/g, (match, chord) => {
    const transposed = transposeNote(chord, currentTransposition);
    return `[${transposed}]`;
  });

  lyricsPanel.innerHTML = formatChordProSong({lyrics: formatted});
  updateScrollbar();
}

// Keyboard bindings for foot controller
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case '3':
            break;
        case '-':
            break;
        case '*':
            break;
        case '/':
            break;
        case '=':
            break;
        default:
            // Log unhandled keys for debugging
            console.log('Unhandled key:', e.key);
    }
});

function setupInteractionHandlers() {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let touchStartX = 0, touchStartY = 0;
  let touchMoved = false;

  let startDistX = null, startDistY = null;
  let lastScale = 1;
  let targetScale = 1;
  let pinchActive = false;
  let fontAdjusted = false, lineAdjusted = false;
  let pinchMode = null; // 'font' or 'line'

  let animationFrameId = null;

  const elements = ['titlebar', 'contentWrapper'];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (isTouch) {
      if (scrollInterval) { clearInterval(scrollInterval); }

      el.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
          e.preventDefault();
          pinchActive = true;
          fontAdjusted = false;
          lineAdjusted = false;

          const distances = getDistances(e.touches);
          startDistX = distances.x;
          startDistY = distances.y;

          // Decide pinch mode based on larger initial distance
          pinchMode = startDistX > startDistY ? 'font' : 'line';

          lastScale = 1;
          targetScale = 1;

          if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(updateAdjustments);
          }
        } else if (e.touches.length === 1) {
          pinchActive = false;
          touchMoved = false;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      }, { passive: false });

      el.addEventListener('touchmove', e => {
        if (pinchActive && e.touches.length === 2 && startDistX && startDistY) {
          e.preventDefault();
          const curDist = getDistances(e.touches);

          // Use the relevant distance based on pinchMode
          targetScale = (pinchMode === 'font' ? curDist.x / startDistX : curDist.y / startDistY);
        } else if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            touchMoved = true;
          }
        }
      }, { passive: false });

      el.addEventListener('touchend', e => {
        if (scrollInterval) {
          scrollPosFloat = lyricsPanel.scrollTop;
        }

        if (!pinchActive && e.changedTouches.length === 1 && touchMoved && !fontAdjusted && !lineAdjusted) {
          const dx = e.changedTouches[0].clientX - touchStartX;
          const dy = e.changedTouches[0].clientY - touchStartY;

          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 80) {
            if (dx > 0 && currentIndex > 0) {
              loadSong(currentIndex - 1);
            } else if (dx < 0 && currentIndex < playlist.length - 1) {
              loadSong(currentIndex + 1);
            }
            return;
          }
        }

        // Reset all
        pinchActive = false;
        fontAdjusted = false;
        lineAdjusted = false;
        startDistX = null;
        startDistY = null;
        lastScale = 1;
        targetScale = 1;
        pinchMode = null;

        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }

        if (!touchMoved && !fontAdjusted && !lineAdjusted) {
          handleClick(id, false);
        }
      });
    } else {
      el.addEventListener('click', () => {
        handleClick(id, false);
      });
    }
  });

  function getDistances(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return { x: Math.abs(dx), y: Math.abs(dy) };
  }

  function updateAdjustments() {
    const smoothingFactor = 0.2;
    lastScale += (targetScale - lastScale) * smoothingFactor;

    const delta = lastScale - 1;

    if (pinchMode === 'font') {
      if (Math.abs(delta) > 0.005) {
        adjustFontSize(delta * 0.5); // adjust multiplier to your taste
        fontAdjusted = true;
      }
    } else if (pinchMode === 'line') {
      if (Math.abs(delta) > 0.005) {
        adjustLineSpacing(delta * 0.02); // adjust multiplier to your taste
        lineAdjusted = true;
      }
    }

    if (pinchActive) {
      animationFrameId = requestAnimationFrame(updateAdjustments);
    } else {
      animationFrameId = null;
    }
  }

  function handleClick(id, isDouble) {
    if (id === 'titlebar') {
      showPLaylist();
    } else if (id === 'contentWrapper') {
      // Toggle autoscroll
      if (lyricsPanel.scrollTop + lyricsPanel.clientHeight >= lyricsPanel.scrollHeight) {
        loadSong(currentIndex + 1);
      } else if (scrollInterval || autoScrollDelay) {
        cancelAutoScroll();
      } else {
        startAutoScroll();
      }
    }
  }

  function adjustFontSize(delta) {
    const panel = document.getElementById('lyricsPanel').style;
    currentFontSize += delta;
    currentFontSize = Math.max(10, Math.min(40, currentFontSize));
    panel.fontSize = currentFontSize + 'px';
    localStorage.setItem('font-size', currentFontSize);
    if (scrollInterval) {
      scrollStep = calculateScrollStep();
    }
  }

  function adjustLineSpacing(delta) {
    const panel = document.getElementById('lyricsPanel').style;
    currentLineHeight += delta;
    currentLineHeight = Math.max(0.8, Math.min(3.0, currentLineHeight));
    localStorage.setItem('line-height', currentLineHeight);
    panel.lineHeight = currentLineHeight;
    if (scrollInterval) {
      scrollStep = calculateScrollStep();
    }
  }
}
