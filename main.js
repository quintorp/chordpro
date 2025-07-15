// ChordPro Viewer JavaScript
import {
    icons
} from './icons.js';

let currentIndex = 0;
let playlist = [];
let scrollInterval = null;
let autoPlayOn = false;
let autoPlayPause = null;
let currentFontSize = 18;
let currentLineHeight = 1.6;
let playlistName = 'Playlist';

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  console.log('App initialized');
  initializeIcons();
  initializeClock();
  setupFileInput();
  handleResize (true);
  setupClickAndSwipeSupport();
  makeResizablePanel();

});

function initializeIcons() {
    document.getElementById('initImportBtn')
        .innerHTML = 'Load a song file (CSV)' + icons.fileImport;
    document.getElementById('autoPlayBtn')
        .innerHTML = icons.autoPlay;
    document.getElementById('fontSizeIcon')
        .innerHTML = icons.textSize;
    document.getElementById('lineHeightIcon')
        .innerHTML = icons.lineHeight;
    document.getElementById('modeBtnIcon')
        .innerHTML = icons.brightness;
    document.getElementById('fileImportBtn')
        .innerHTML = icons.fileImport;
    document.getElementById('titlebarIcon')
        .innerHTML = icons.autoScroll;
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
    const initImportBtn = document.getElementById("initImportBtn");
    const controlBar = document.getElementById("controlBar");
    if (window.getComputedStyle(initImportBtn)
        .display == 'flex') {
        controlBar.style.display = 'flex';
        initImportBtn.style.display = 'none';
    }
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

    // Extract playlist name from filename
    playlistName = file.name.replace('.csv', '')
        .replace(/[-_]/g, ' ');

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

    handleAutoPlay('cancel');
    toggleMobilecontrolBar(true);

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

function populatePlaylistDropdown() {
    const dropdown = document.getElementById('playlistDropdown');
    if (!dropdown) {
        console.error('Playlist dropdown element not found');
        return;
    }

    dropdown.innerHTML = '';

    playlist.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        // Try different possible column names for title
        const title = song.title || song.name || song.song || song.songname || `Song ${index + 1}`;
        item.textContent = title;
        item.onclick = () => loadSong(index);
        dropdown.appendChild(item);
    });
}

function showPLaylist() {
  document.getElementById('playlistDropdown').style.display = 'block';
}

function loadSong(index) {
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

    // Reset scroll position to top
    const contentWrapper = document.getElementById('contentWrapper');
    contentWrapper.scrollTop = 0;

    document.getElementById('playlistDropdown')
        .classList.remove('show');
    toggleMobilecontrolBar(true);
    updateSongInfo(song);
    updatePlaylistHighlight();
    document.getElementById('songTitleDisplay').innerHtml = autoPlayOn;
    autoPlayOn ? handleAutoPlay('songTop') : null;
}

function handleAutoPlay(status = 'toggle') {
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const titlebar = document.getElementById('titlebar');
    const titlebarIcon = document.getElementById('titlebarIcon');
    const contentWrapper = document.getElementById('contentWrapper');
// document.getElementById('songTitleDisplay').textContent = 'handleAutoPlay: '+ status;
    console.log ('handleAutoPlay: ', status);

    switch (status) {
      case 'start':
        autoPlayOn = false;
        case 'toggle':
            autoPlayOn = !autoPlayOn;
            clearTimeout(autoPlayPause);
            clearInterval(scrollInterval);
            toggleMobilecontrolBar(true);

            if ((!autoPlayOn) || (scrollEnd() && lastSong())){
                handleAutoPlay('cancel');
                return;
            }
            autoPlayBtn.classList.add('armed');
            if (scrollEnd()) {
              loadSong(currentIndex + 1);
            } else if (scrollEnd(true)) {
              handleAutoPlay ('songTop');
            } else {
              handleAutoPlay ('scroll');
            }
		        break;

        case 'songTop':
            clearTimeout(autoPlayPause);
            clearInterval(scrollInterval);
            autoPlayBtn.innerHTML = icons.autoScroll;
            titlebarIcon.innerHTML = icons.autoScroll;
            pulseControls (true, true);
            autoPlayPause = setTimeout(() => {
                handleAutoPlay('scroll');
            }, 10000);
            break;

        case 'scroll':
            pulseControls (false, null);
            scrollInterval = setInterval(() => {
                contentWrapper.scrollTop += 1;
                if (scrollEnd()) {
                    handleAutoPlay('songEnd');
                }
            }, 100);
            break;

        case 'songEnd':
            clearInterval(scrollInterval);
            autoPlayBtn.innerHTML = icons.autoPlay;
            titlebarIcon.innerHTML = icons.autoPlay;
            pulseControls (true, false);
            if (lastSong()) {
                handleAutoPlay('cancel');
                return;
            }

            autoPlayPause = setTimeout(() => {
                loadSong(currentIndex + 1);
            }, 10000);
            break;

        case 'cancel':
            autoPlayOn = false;
            clearTimeout(autoPlayPause);
            clearInterval(scrollInterval);
            autoPlayBtn.classList.remove('armed');
            autoPlayBtn.innerHTML = icons.autoScroll;
            titlebarIcon.innerHTML = icons.autoScroll;

            pulseControls (false, null);
            break;

        default:
            // Log unhandled keys for debugging
            console.log('Unhandled status', status);
            break;
    }
    function pulseControls (pulseOn = true, tempo){
      const autoPlayBtn = document.getElementById('autoPlayBtn');
      const titlebar = document.getElementById('titlebar');
      const currentSong = playlist[currentIndex];
      if (pulseOn){
        const songTempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
        let pulseRate = (60 / parseInt(songTempo)).toString() + 's';
        autoPlayBtn.classList.add('pulse');
        autoPlayBtn.style.setProperty('--tempo-duration', pulseRate);
        titlebar.classList.add('pulse');
        titlebar.style.setProperty('--tempo-duration', pulseRate);
      } else {
        autoPlayBtn.classList.remove('pulse');
        titlebar.classList.remove('pulse');
      }
    }
    function scrollEnd (atTop = false){
      const contentWrapper = document.getElementById('contentWrapper');
      if (atTop) {
        return contentWrapper.scrollTop <= 10;
      } else {
        return contentWrapper.scrollTop >= (contentWrapper.scrollHeight - contentWrapper.clientHeight - 5);
      }
    }
    function lastSong(){
      return currentIndex >= playlist.length;
    }
}

// Format ChordPro song with alternating sections and section labels
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

function formatDuration(seconds) {
    if (!seconds || seconds === 'Unknown') return '';

    const numSeconds = parseInt(seconds);
    if (isNaN(numSeconds)) return '';

    const minutes = Math.floor(numSeconds / 60);
    const remainingSeconds = numSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateSongInfo(song) {
    const infoBox = document.getElementById('songInfoBox');
    const titleDisplay = document.getElementById('songTitleDisplay');

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

    infoBox.innerHTML = `
        <div class="song-metadata">${metadataHtml}</div>
        <div class="song-next-info">${currentIndex + 1} of ${playlist.length}</div>
        <div class="song-next-info">Next: ${nextTitle}</div>`;
}

function updatePlaylistHighlight() {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
        item.classList.toggle('active', index === currentIndex);
    });
}

function scrollToSection(direction) {
    toggleMobilecontrolBar(true);
    const contentWrapper = document.getElementById('contentWrapper');
    const sections = contentWrapper.querySelectorAll('.lyrics-section');

    if (sections.length === 0) {
        // Fallback to old behavior if no sections
        contentWrapper.scrollTop += direction * ontentWrapper.clientHeight * 0.8;
        return;
    }

    const currentScroll = contentWrapper.scrollTop;

    if (direction === 1) {
        // Find next section that's not fully visible
        for (let section of sections) {
            const sectionTop = section.offsetTop;
            if (sectionTop > currentScroll + 10) {
                contentWrapper.scrollTop = sectionTop;
                break;
            }
        }
    } else {
        // Find previous section
        for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            const sectionTop = section.offsetTop;
            if (sectionTop < currentScroll - 10) {
                contentWrapper.scrollTop = sectionTop;
                break;
            }
        }
    }
}

window.addEventListener('resize', () => handleResize());
function handleResize(hide) {
  let isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const controlBarStyle = document.getElementById('controlBar').style;
  const overlayStyle = document.getElementById('mobileOverlay').style;
  const titlebarIconStyle = document.getElementById('titlebarIcon').style;
  const playlistDropdownStyle = document.getElementById('playlistDropdown').style;
  if (isMobile || hide) {
        titlebarIconStyle.display = 'block';
        controlBarStyle.display = 'none';
     } else {
        titlebarIconStyle.display = 'none';
        playlistDropdownStyle.display = 'none';
        controlBarStyle.display = 'flex';
        overlayStyle.display = 'none';
        playlistDropdownStyle.display = 'none';
    }
}

function toggleMode() {
    document.body.classList.toggle('light-mode');
}

// Keyboard bindings for foot controller
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case '3':
            // Scroll to top
            document.getElementById('contentWrapper')
                .scrollTop = 0;
            break;
        case '-':
            // Toggle autoplay
            handleAutoPlay('toggle');
            break;
        case '*':
            // Toggle autoscroll
            // toggleScroll();
            break;
        case '/':
            // Next lyrics section
            scrollToSection(1);
            break;
        case '=':
            // Next song
            loadSong(currentIndex + 1);
            break;
        default:
            // Log unhandled keys for debugging
            console.log('Unhandled key:', e.key);
    }
});

// Make functions globally available
// window.hidePlaylist = hidePlaylist;
window.loadSong = loadSong;
window.scrollToSection = scrollToSection;
/* window.toggleScroll = toggleScroll;*/
window.toggleMode = toggleMode;
window.handleAutoPlay = handleAutoPlay;
window.currentIndex = currentIndex;
window.toggleMobilecontrolBar = toggleMobilecontrolBar;
window.closeMobilecontrolBar = toggleMobilecontrolBar;

function toggleMobilecontrolBar(close = false) {
    const controlBar = document.getElementById('controlBar');
    const overlay = document.getElementById('mobileOverlay');

    if (controlBar.classList.contains('mobile-open') || close) {
      controlBar.classList.remove('mobile-open');
      overlay.classList.remove('mobile-show');
   } else {
      controlBar.classList.add('mobile-open');
      overlay.classList.add('mobile-show');
    }
}

function handleDragValue(delta) {
  const lyricsPanelStyle = document.getElementById('lyricsPanel').style;
  switch (dragTarget) {
    case 'fontSizeControl':
      currentFontSize += delta;
      currentFontSize = Math.max(12, Math.min(32, currentFontSize));
      lyricsPanelStyle.fontSize = currentFontSize + 'px';
      break;
    case 'lineHeightControl':
      currentLineHeight += delta * 0.1;
      currentLineHeight = Math.max(1.0, Math.min(2.5, currentLineHeight));
      lyricsPanelStyle.lineHeight = currentLineHeight;
      break;
    default:
      console.log('Unhandled drag event: ', dragTarget);
  }
}

document.querySelectorAll('.draggable')
  .forEach(dragButton => {
    dragButton.addEventListener('mouseover', () => {
      dragButton.style.cursor = 'ns-resize';
    });
    dragButton.addEventListener('mouseout', () => {
      if (!dragTarget) {
        dragButton.style.cursor = '';
      }
    });
    dragButton.addEventListener('mousedown', (e) => {
      dragTarget = e.target.id;
      startY = e.clientY;
      document.body.style.cursor = 'ns-resize';
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
    });
  });
    
let dragTarget = null;
let startY = 0;

document.addEventListener('mousemove', (e) => {
  if (!dragTarget) return;
  const deltaY = e.clientY - startY;
  startY = e.clientY;
  handleDragValue(deltaY, e.target);
});
    
document.addEventListener('mouseup', () => {
  if (dragTarget) {
    dragTarget = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

function sendMessage(msg) {
    console.log("Gesture:", msg);
}
// Block pinch zoom (multi-touch)
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, {
    passive: false
});

// Block double-tap zoom
let lastTouch = 0;
document.addEventListener('touchend', function(e) {
    const now = new Date()
        .getTime();
    if (now - lastTouch <= 300) {
        e.preventDefault();
    }
    lastTouch = now;
}, false);

function makeResizablePanel() {
  const resizer = document.getElementById('resizer');
  const controlBar = document.getElementById('controlBar');
  const mainContent = document.getElementById('mainContent');

  let isDragging = false;

  resizer.addEventListener('mousedown', function (e) {
    isDragging = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    const mainRect = mainContent.getBoundingClientRect();
    const offset = mainRect.right - e.clientX;
    const newWidth = Math.min(Math.max(offset, 180), 600); // clamp to min/max
    controlBar.style.width = newWidth + 'px';
    console.log(newWidth, controlBar.style.width);
    
  });

  document.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

function setupClickAndSwipeSupport() {
  let touchMoved = false;
  let startX = 0, startY = 0;
  let lastTapTime = 0;
  const doubleTapDelay = 300;

  // Attach event listeners on .clickable elements
  document.querySelectorAll('.clickable').forEach(el => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      // Touch device: use touch events only
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true });
      el.addEventListener('touchend', onTouchEnd);
    } else {
      // Mouse/desktop: use click events with timer for double click
      el.addEventListener('click', onMouseClick);
    }
  });

  // Touch handlers
  function onTouchStart(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    touchMoved = false;
  }

  function onTouchMove(e) {
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx > 5 || dy > 5) {
      touchMoved = true;
    }
  }

  function onTouchEnd(e) {
    if (touchMoved) {
      // Drag/swipe, don't trigger tap
      touchMoved = false;
      return;
    }

    const currentTime = Date.now();
    const tapLength = currentTime - lastTapTime;
    lastTapTime = currentTime;
    const target = e.currentTarget.id;

    if (tapLength > 0 && tapLength < doubleTapDelay) {
      // Double tap detected
      handleClick(target, true);
    } else {
      // Single tap, delay firing in case of double tap
      setTimeout(() => {
        // Only fire single tap if no double tap happened
        if (Date.now() - lastTapTime >= doubleTapDelay) {
          handleClick(target, false);
        }
      }, doubleTapDelay);
    }
  }

  // Mouse handlers
  let clickTimer = null;

  function onMouseClick(e) {
    const target = e.currentTarget.id;

    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      handleClick(target, true); // double click
    } else {
      clickTimer = setTimeout(() => {
        handleClick(target, false); // single click
        clickTimer = null;
      }, doubleTapDelay);
    }
  }

  // Swipe logic on #contentWrapper only

  const contentWrapper = document.getElementById('contentWrapper');
  let swipeStartX = 0, swipeStartY = 0;
  let swipeEndX = 0, swipeEndY = 0;
  if (contentWrapper) {
    contentWrapper.addEventListener('touchstart', e => {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
    }, { passive: true });

    contentWrapper.addEventListener('touchend', e => {
      swipeEndX = e.changedTouches[0].clientX;
      swipeEndY = e.changedTouches[0].clientY;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const deltaX = swipeEndX - swipeStartX;
    const deltaY = swipeEndY - swipeStartY;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        if (currentIndex > 0) loadSong(currentIndex - 1);
      } else {
        if (currentIndex < playlist.length - 1) loadSong(currentIndex + 1);
      }
    }
  }

  // Your existing click handler logic

  function handleClick(target, doubleClick) {
    switch (target) {
      case 'titlebar':
        doubleClick ? toggleMobilecontrolBar() : showPLaylist();
        break;
      case 'contentWrapper':
        doubleClick ? handleAutoPlay('start') : handleAutoPlay('cancel');
        break;
    }
  }
}
