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
    setupSwipeSupport();
    setupDragControls();

    // Trigger CSV load request on page load
    setTimeout(() => {
        if (playlist.length === 0) {
            document.getElementById('fileInput')
                .click();
        }
    }, 1000);
);

function initializeIcons() {
    document.getElementById('initImportBtn')
        .innerHTML = 'Load a song file (CSV)' + icons.fileImport;
    document.getElementById('autoPlayBtn')
        .innerHTML = icons.autoPlay;
    document.getElementById('fontSizeIcon')
        .innerHTML = icons.textSize;
    document.getElementById('lineHeightIcon')
        .innerHTML = icons.lineHeight;
    document.getElementById('modeBtn')
        .innerHTML = icons.brightness;
    document.getElementById('fileImportBtn')
        .innerHTML = icons.fileImport;
}

function initializeClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit'
        });
        document.getElementById('clock')
            .textContent = timeString;
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
    const rightBar = document.getElementById("rightBar");
    console.log(window.getComputedStyle(initImportBtn)
        .display == 'flex');
    if (window.getComputedStyle(initImportBtn)
        .display == 'flex') {
        rightBar.style.display = 'flex';
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
    toggleMobileRightBar(true);

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

    const titleBtn = document.getElementById('playlistTitleBtn');
    titleBtn.textContent = playlistName;
}

function togglePlaylistDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('playlistDropdown');
    if (!dropdown) {
        console.error('Playlist dropdown element not found');
        return;
    }

    dropdown.classList.toggle('show');

    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && !document.getElementById('playlistTitleBtn')
            .contains(e.target)) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

function loadSong(index) {
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
    toggleMobileRightBar(true);
    updateSongInfo(song);
    updatePlaylistHighlight();
    autoPlayOn ? handleAutoPlay('songTop') : null;
}

function handleAutoPlay(status = 'toggle') {
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    console.log ('handleAutoPlay: ', status);

    switch (status) {
        case 'toggle':
            clearTimeout(autoPlayPause);
            clearInterval(scrollInterval);
            toggleMobileRightBar(true);

            autoPlayOn = !autoPlayOn;

            if ((!autoPlayOn) || (scrollEnd() && lastSong())){
                handleAutoPlay('cancel');
                return;
            }
            autoPlayBtn.classList.add('active');
            if (scrollEnd()) {
              loadSong(currentIndex + 1);
            } else if (scrollEnd(true)) {
              handleAutoPlay ('songTop');
            } else {
              handleAutoPlay ('startScroll');
            }
		        break;

        case 'songTop':
            autoPlayBtn.innerHTML = icons.autoScroll;
            autoPlayBtn.classList.add('tempo-pulse');
            autoPlayBtn.style.setProperty('--tempo-duration', `${getPulseRate()}s`);
            autoPlayPause = setTimeout(() => {
                handleAutoPlay('startScroll');
            }, 10000);
            break;

        case 'startScroll':
            autoPlayBtn.classList.remove('tempo-pulse');

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
            if (lastSong()) {
                handleAutoPlay('cancel');
                return;
            }

            autoPlayPause = setTimeout(() => {
                loadSong(currentIndex + 1);
            }, 10000);
            autoPlayBtn.classList.add('tempo-pulse');
            autoPlayBtn.style.setProperty('--tempo-duration', '1s');
            break;

        case 'cancel':
            autoPlayOn = false;
            clearTimeout(autoPlayPause);
            clearInterval(scrollInterval);
            autoPlayBtn.innerHTML = icons.autoScroll;
            autoPlayBtn.classList.remove('active');
            autoPlayBtn.classList.remove('tempo-pulse');
            break;

        default:
            // Log unhandled keys for debugging
            console.log('Unhandled status', status);
            break;
    }
    function getPulseRate() {
        const currentSong = playlist[currentIndex];
        const tempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
        return 60 / parseInt(tempo);
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
    console.log(playlist.indexOf(song) < playlist.length);
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
    toggleMobileRightBar(true);
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
window.togglePlaylistDropdown = togglePlaylistDropdown;
window.loadSong = loadSong;
window.scrollToSection = scrollToSection;
/* window.toggleScroll = toggleScroll;*/
window.toggleMode = toggleMode;
window.handleAutoPlay = handleAutoPlay;
window.currentIndex = currentIndex;
window.toggleMobileRightBar = toggleMobileRightBar;
window.closeMobileRightBar = toggleMobileRightBar;

function toggleMobileRightBar(close = false) {
    const rightBar = document.getElementById('rightBar');
    const overlay = document.getElementById('mobileOverlay');

    if (rightBar.classList.contains('mobile-open') || close) {
      rightBar.classList.remove('mobile-open');
      overlay.classList.remove('mobile-show');    
      if (isMobile() && playlist.length > 0) {
        mobileTab.classList.remove('mobile-hide');
      }
   } else {
      rightBar.classList.add('mobile-open');
      overlay.classList.add('mobile-show');
      mobileTab.classList.add('mobile-hide');
    }
}
function handleDragValue(delta) {
  const lyricsPanelStyle = document.getElementById('lyricsPanel').style;
  console.log(dragTarget);
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

document.querySelectorAll('.drag-control')
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

function setupDragControls() {
    const lyricsPanel = document.getElementById('lyricsPanel');
    let isPinching = false;
    let gestureStart = [];
    let swipeStartX = null;

    lyricsPanel.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // Begin pinch gesture
            isPinching = true;
            gestureStart = [{
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            }, {
                x: e.touches[1].clientX,
                y: e.touches[1].clientY
            }];
            e.preventDefault();
        } else if (e.touches.length === 1 && !isPinching) {
            // Begin swipe
            swipeStartX = e.touches[0].clientX;
        }
    }, {
        passive: false
    });

    lyricsPanel.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2 && gestureStart.length === 2) {
            const current = [{
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            }, {
                x: e.touches[1].clientX,
                y: e.touches[1].clientY
            }];

            const startDx = Math.abs(gestureStart[0].x - gestureStart[1].x);
            const startDy = Math.abs(gestureStart[0].y - gestureStart[1].y);
            const currentDx = Math.abs(current[0].x - current[1].x);
            const currentDy = Math.abs(current[0].y - current[1].y);

            const deltaX = currentDx - startDx;
            const deltaY = currentDy - startDy;

            // Update font size
            const fontSizeSensitivity = 0.1;
            currentFontSize = Math.max(12, Math.min(32, currentFontSize + deltaX * fontSizeSensitivity));
            lyricsPanel.style.fontSize = currentFontSize + 'px';

            // Update line height
            const lineHeightSensitivity = 0.002;
            currentLineHeight = Math.max(1.0, Math.min(2.5, currentLineHeight + deltaY * lineHeightSensitivity));
            lyricsPanel.style.lineHeight = currentLineHeight;

            gestureStart = current;
            e.preventDefault();
        }
    }, {
        passive: false
    });

    lyricsPanel.addEventListener('touchend', (e) => {
        if (isPinching) {
            // End pinch gesture — suppress swipe
            if (e.touches.length < 2) {
                isPinching = false;
                gestureStart = [];
                swipeStartX = null; // prevent swipe from firing
            }
            return; // Skip swipe detection
        }

        // Swipe detection only if not pinching and it was a one-finger touch
        if (swipeStartX !== null && e.changedTouches.length === 1) {
            const endX = e.changedTouches[0].clientX;
            const dx = endX - swipeStartX;
            const threshold = 30;

            if (dx > threshold) {
                sendMessage("Swipe Right");
            } else if (dx < -threshold) {
                sendMessage("Swipe Left");
            }
        }
        // Reset swipe start
        swipeStartX = null;
    });
}

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

function hideControls() {
    if (isMobile()) {
        const mobileControl = document.getElementById('playlistDropdown');
        mobileControl.classList.remove('show');
    }
}

function setupSwipeSupport() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.querySelectorAll('.drag-control')
            .forEach(el => {
                el.style.cssText += 'display: none !important;';
            });
    }

    const contentWrapper = document.getElementById('contentWrapper');
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    contentWrapper.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, {
        passive: true
    });

    contentWrapper.addEventListener('touchend', function(e) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
        handleSwipe();
    }, {
        passive: true
    });

    function handleSwipe() {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;

        // Check if horizontal swipe is more significant than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // Swipe right - previous song
                if (currentIndex > 0) {
                    loadSong(currentIndex - 1);
                }
            } else {
                // Swipe left - next song
                if (currentIndex < playlist.length - 1) {
                    loadSong(currentIndex + 1);
                }
            }

            // } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
            //     if (deltaY < 0) {
            //         // Swipe up - next section
            //         scrollToSection(1);
            //     } else {
            //         // Swipe down - previous section
            //         scrollToSection(-1);
            //     }
        }
    }
}
