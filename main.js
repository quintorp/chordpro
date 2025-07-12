// ChordPro Viewer JavaScript
import { icons } from './icons.js';

let currentIndex = 0;
let playlist = [];
let isScrolling = false;
let scrollInterval;
let scrollDelayTimeout;
let isAutoPlay = false;
let autoPlayInterval;
let autoPlayDelayTimeout;
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
            document.getElementById('fileInput').click();
        }
    }, 1000);
    
    // Show mobile tab on mobile devices initially
    if (isMobile()) {
        const mobileTab = document.getElementById('mobileTab');
        mobileTab.classList.add('mobile-show');
    }
});

// Initialize icons
function initializeIcons() {
    document.getElementById('nextSectionBtn').innerHTML = icons.nextIcon;
    document.getElementById('scrollBtn').innerHTML = icons.playerPlay;
    document.getElementById('nextSongBtn').innerHTML = icons.playerTrackNext;
    document.getElementById('autoPlayBtn').innerHTML = icons.autoPlay;

    document.getElementById('modeBtn').innerHTML = icons.brightness;
    document.getElementById('fileImportBtn').innerHTML = icons.fileImport;
    document.getElementById('initImportBtn').innerHTML = 'Load a song file (CSV)' + icons.fileImport;
    
    // Initialize drag control icons
    document.getElementById('fontSizeIcon').innerHTML = icons.textSize;
    document.getElementById('lineHeightIcon').innerHTML = icons.lineHeight;
}

// Clock functionality
function initializeClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: true,
            hour: 'numeric',
            minute: '2-digit'
        });
        document.getElementById('clock').textContent = timeString;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// File input setup
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('File input setup complete');
    } else {
        console.error('File input element not found');
    }
}

// Handle CSV file selection
function handleFileSelect(event) {
  const initImportBtn = document.getElementById("initImportBtn");
  const rightBar = document.getElementById("rightBar");
    console.log(window.getComputedStyle(initImportBtn).display == 'flex');
    if (window.getComputedStyle(initImportBtn).display == 'flex'){
      rightBar.style.display = 'flex';
      initImportBtn.style.display = 'none';
    }
    const file = event.target.files[0];
    console.log('File selected:', file);
    
    if (!file) {
        console.log('No file selected');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
    }
    
    // Extract playlist name from filename
    playlistName = file.name.replace('.csv', '').replace(/[-_]/g, ' ');
    
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

// Parse CSV playlist
function parsePlaylist(csvData) {
    console.log('Parsing CSV data...');
    
    // Stop autoscroll and autoplay when new playlist is loaded
    if (isScrolling) {
        clearInterval(scrollInterval);
        clearTimeout(scrollDelayTimeout);
        isScrolling = false;
        const scrollBtn = document.getElementById('scrollBtn');
        scrollBtn.classList.remove('active');
        scrollBtn.classList.remove('armed');
        scrollBtn.classList.remove('tempo-pulse');
    }
    
    if (isAutoPlay) {
        clearInterval(autoPlayInterval);
        clearTimeout(autoPlayDelayTimeout);
        isAutoPlay = false;
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        autoPlayBtn.classList.remove('active');
        autoPlayBtn.classList.remove('armed');
        autoPlayBtn.classList.remove('tempo-pulse');
    }
    
    // Show mobile tab when playlist is loaded
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
            return header.trim().toLowerCase();
        },
        complete: function(results) {
            console.log('Parse results:', results);
            
            if (results.errors && results.errors.length > 0) {
                console.error('Parse errors:', results.errors);
            }
            
            if (results.data && results.data.length > 0) {
                playlist = results.data.filter(row => {
                    // Filter out empty rows
                    return Object.values(row).some(value => value && value.trim() !== '');
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

// Populate playlist dropdown
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
    
    updatePlaylistTitle();
}

// Toggle playlist dropdown
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
        if (!dropdown.contains(e.target) && !document.getElementById('playlistTitleBtn').contains(e.target)) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

// Load a song by index
function loadSong(index) {
    if (index < 0 || index >= playlist.length) {
        console.log('Invalid song index:', index);
        return;
    }
    toggleMobileRightBar(true);
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
    
    // If autoplay is on and autoscroll is on, start autoscroll after 10 seconds with tempo pulsing
    const scrollBtn = document.getElementById('scrollBtn');
    if (isAutoPlay) {
        // When autoplay is on, autoscroll should also be on
        if (!isScrolling) {
            isScrolling = true;
        }
        
        // Reset autoscroll state
        clearInterval(scrollInterval);
        clearTimeout(scrollDelayTimeout);
        
        scrollBtn.classList.add('active');
        scrollBtn.classList.add('armed');
        scrollBtn.classList.add('tempo-pulse');
        
        const currentSong = playlist[currentIndex];
        const tempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
        const tempoDuration = 60 / parseInt(tempo);
        scrollBtn.style.setProperty('--tempo-duration', `${tempoDuration}s`);
        
        scrollDelayTimeout = setTimeout(() => {
            startScrolling();
        }, 10000);
    } else if (isScrolling) {
        // If only autoscroll is on, start with tempo pulsing
        clearInterval(scrollInterval);
        clearTimeout(scrollDelayTimeout);
        
        scrollBtn.classList.add('active');
        scrollBtn.innerHTML = icons.playerPlay;
        scrollBtn.classList.add('armed');
        scrollBtn.classList.add('tempo-pulse');
        
        const currentSong = playlist[currentIndex];
        const tempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
        const tempoDuration = 60 / parseInt(tempo);
        scrollBtn.style.setProperty('--tempo-duration', `${tempoDuration}s`);
        
        scrollDelayTimeout = setTimeout(() => {
            startScrolling();
        }, 10000);
    }
    
    // Update song info
    updateSongInfo(song);
    updatePlaylistHighlight();
    
    // Close dropdown
    document.getElementById('playlistDropdown').classList.remove('show');
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
        }
        
        sectionContent = sectionContent.replace(/\n/g, '<br>');
        result += `<div class="lyrics-section ${sectionClass}">${sectionContent}</div>`;
    });
    
    return result || formatted.replace(/\n/g, '<br>');
}

// Format duration from seconds to MM:SS
function formatDuration(seconds) {
    if (!seconds || seconds === 'Unknown') return '';
    
    const numSeconds = parseInt(seconds);
    if (isNaN(numSeconds)) return '';
    
    const minutes = Math.floor(numSeconds / 60);
    const remainingSeconds = numSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update song info box
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

// Update playlist title button
function updatePlaylistTitle() {
    const titleBtn = document.getElementById('playlistTitleBtn');
    titleBtn.textContent = playlistName;
}

// Update playlist highlight
function updatePlaylistHighlight() {
    const items = document.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
        item.classList.toggle('active', index === currentIndex);
    });
}

// Scroll to section - fixed to work with contentWrapper
function scrollToSection(direction) {
    // Stop autoscroll and autoplay when next section button is clicked
    toggleMobileRightBar(true);
    if (isScrolling) {
        clearInterval(scrollInterval);
        clearTimeout(scrollDelayTimeout);
        isScrolling = false;
        const scrollBtn = document.getElementById('scrollBtn');
        scrollBtn.classList.remove('active');
        scrollBtn.classList.remove('armed');
        scrollBtn.classList.remove('tempo-pulse');
    }
    
    if (isAutoPlay) {
        clearInterval(autoPlayInterval);
        clearTimeout(autoPlayDelayTimeout);
        isAutoPlay = false;
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        autoPlayBtn.classList.remove('active');
        autoPlayBtn.classList.remove('armed');
        autoPlayBtn.classList.remove('tempo-pulse');
    }
    
    const contentWrapper = document.getElementById('contentWrapper');
    const sections = contentWrapper.querySelectorAll('.lyrics-section');
    
    if (sections.length === 0) {
        // Fallback to old behavior if no sections
        const scrollAmount = contentWrapper.clientHeight * 0.8;
        if (direction === 1) {
            contentWrapper.scrollTop += scrollAmount;
        } else {
            contentWrapper.scrollTop -= scrollAmount;
        }
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

// Toggle auto scroll - enhanced with delay and red indicator
function toggleScroll() {
    toggleMobileRightBar(true);
    const scrollBtn = document.getElementById('scrollBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    
    if (isScrolling) {
        // Stop scrolling
        clearInterval(scrollInterval);
        clearTimeout(scrollDelayTimeout);
        isScrolling = false;
        scrollBtn.innerHTML = icons.playerPlay;
        scrollBtn.classList.remove('active');
        scrollBtn.classList.remove('armed');
        scrollBtn.classList.remove('tempo-pulse');
    } else {
        scrollBtn.classList.add('active');
        // Check if we're at the top of the song
        if (contentWrapper.scrollTop <= 10) {
            // Start scrolling with tempo-based pulsing for 10 seconds
            startScrollingWithDelay();
        } else {
            // Start scrolling immediately if not at top
            startScrolling();
        }
        isScrolling = true;
    }
}

// Start scrolling with tempo-based delay
function startScrollingWithDelay() {
    const scrollBtn = document.getElementById('scrollBtn');
    const currentSong = playlist[currentIndex];
    const tempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
    
    scrollBtn.innerHTML = icons.playerPlay;
    scrollBtn.classList.add('armed');
    scrollBtn.classList.add('tempo-pulse');
    
    // Set tempo-based pulsing
    const tempoDuration = 60 / parseInt(tempo); // Convert BPM to seconds per beat
    scrollBtn.style.setProperty('--tempo-duration', `${tempoDuration}s`);
    
    scrollDelayTimeout = setTimeout(() => {
        startScrolling();
    }, 10000);
}

// Start the actual scrolling
function startScrolling() {
    const scrollBtn = document.getElementById('scrollBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    
    scrollBtn.innerHTML = icons.playerPlay;
    scrollBtn.classList.remove('armed');
    scrollBtn.classList.remove('tempo-pulse');
    
    scrollInterval = setInterval(() => {
        contentWrapper.scrollTop += 1;
        
        // Check if we've reached the bottom - more precise check
        if (contentWrapper.scrollTop >= contentWrapper.scrollHeight - contentWrapper.clientHeight - 5) {
            // Stop scrolling
            clearInterval(scrollInterval);
            isScrolling = false;
            scrollBtn.innerHTML = icons.playerPlay;
            
            // Only advance to next song if autoplay is active
            if (isAutoPlay) {
                const autoPlayBtn = document.getElementById('autoPlayBtn');
                autoPlayBtn.classList.add('armed');
                autoPlayBtn.classList.add('tempo-pulse');
                
                // Flash at 60 BPM (1 second intervals)
                autoPlayBtn.style.setProperty('--tempo-duration', '1s');
                
                autoPlayDelayTimeout = setTimeout(() => {
                    autoPlayBtn.classList.remove('armed');
                    autoPlayBtn.classList.remove('tempo-pulse');
                    if (currentIndex < playlist.length - 1) {
                        loadSong(currentIndex + 1);
                    } else {
                        // Stop autoplay at end of playlist
                        isAutoPlay = false;
                        autoPlayBtn.classList.remove('active');
                        autoPlayBtn.classList.remove('armed');
                        autoPlayBtn.classList.remove('tempo-pulse');
                    }
                }, 10000);
            }
        }
    }, 100);
}

// Adjust font size
function adjustFont(delta) {
    currentFontSize += delta;
    currentFontSize = Math.max(12, Math.min(32, currentFontSize));
    
    const lyricsPanel = document.getElementById('lyricsPanel');
    lyricsPanel.style.fontSize = currentFontSize + 'px';
}

// Adjust line height
function adjustLineHeight(delta) {
    currentLineHeight += delta * 0.1;
    currentLineHeight = Math.max(1.0, Math.min(2.5, currentLineHeight));
    
    const lyricsPanel = document.getElementById('lyricsPanel');
    lyricsPanel.style.lineHeight = currentLineHeight;
}

// Toggle light/dark mode
function toggleMode() {
    document.body.classList.toggle('light-mode');
}

// Toggle auto play - separate from autoscroll
function toggleAutoPlay() {
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const scrollBtn = document.getElementById('scrollBtn');

    toggleMobileRightBar(true);
  
    if (isAutoPlay) {
        clearInterval(autoPlayInterval);
        clearTimeout(autoPlayDelayTimeout);
        isAutoPlay = false;
        autoPlayBtn.classList.remove('active');
        autoPlayBtn.classList.remove('armed');
        autoPlayBtn.classList.remove('tempo-pulse');
        
        // Also turn off autoscroll when autoplay is turned off
        if (isScrolling) {
            clearInterval(scrollInterval);
            clearTimeout(scrollDelayTimeout);
            isScrolling = false;
            scrollBtn.classList.remove('active');
            scrollBtn.classList.remove('armed');
            scrollBtn.classList.remove('tempo-pulse');
            scrollBtn.innerHTML = icons.playerPlay;
        }
    } else {
        isAutoPlay = true;
        autoPlayBtn.classList.add('active');
        
        // Always turn on autoscroll when autoplay is turned on
        if (!isScrolling) {
            isScrolling = true;
            scrollBtn.classList.add('active');
            scrollBtn.innerHTML = icons.playerPlay;
            
            // Check if we're at the top of the song to determine if we should arm or start immediately
            const contentWrapper = document.getElementById('contentWrapper');
            if (contentWrapper.scrollTop <= 10) {
                // At top - arm with delay
                const currentSong = playlist[currentIndex];
                const tempo = currentSong?.tempo || currentSong?.bpm || currentSong?.speed || 120;
                const tempoDuration = 60 / parseInt(tempo);
                
                scrollBtn.classList.add('armed');
                scrollBtn.classList.add('tempo-pulse');
                scrollBtn.style.setProperty('--tempo-duration', `${tempoDuration}s`);
                
                scrollDelayTimeout = setTimeout(() => {
                    startScrolling();
                }, 10000);
            } else {
                // Not at top - start immediately
                startScrolling();
            }
        }
    }
}

// Keyboard bindings for foot controller
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case '3':
      // Scroll to top
      document.getElementById('contentWrapper').scrollTop = 0;
      break;
    case '-':
      // Toggle autoplay
      toggleAutoPlay();
      break;
    case '*':
      // Toggle autoscroll
      toggleScroll();
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
window.toggleScroll = toggleScroll;
window.adjustFont = adjustFont;
window.adjustLineHeight = adjustLineHeight;
window.toggleMode = toggleMode;
window.toggleAutoPlay = toggleAutoPlay;
window.currentIndex = currentIndex;

// Mobile responsive functions
function toggleMobileTab(show = true) {
    if (! isMobile()) { return };
    const mobileTab = document.getElementById('mobileTab');
    if (show){
        mobileTab.classList.add('mobile-show');
        mobileTab.classList.remove('mobile-hide');
    } else {
        mobileTab.classList.remove('mobile-show');
        mobileTab.classList.add('mobile-hide');
    }
}

function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function toggleMobileRightBar(close = false) {
    const rightBar = document.getElementById('rightBar');
    const overlay = document.getElementById('mobileOverlay');
    const mobileTab = document.getElementById('mobileTab');
    
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

// Handle window resize
window.addEventListener('resize', function() {
    const mobileTab = document.getElementById('mobileTab');
    const rightBar = document.getElementById('rightBar');
    const overlay = document.getElementById('mobileOverlay');
    
    if (!isMobile()) {
        // Desktop view
        mobileTab.classList.add('mobile-hide');
        mobileTab.classList.remove('mobile-show');
        rightBar.classList.remove('mobile-open');
        overlay.classList.remove('mobile-show');
    } else {
        // Mobile view with playlist loaded
        mobileTab.classList.add('mobile-show');
        mobileTab.classList.remove('mobile-hide');
    }
});

// Make mobile functions globally available
window.toggleMobileRightBar = toggleMobileRightBar;
window.closeMobileRightBar = toggleMobileRightBar;

// Setup drag controls for font size and line height
function setupDragControls() {
    const fontSizeControl = document.getElementById('fontSizeControl');
    const lineHeightControl = document.getElementById('lineHeightControl');
    
    setupDragControl(fontSizeControl, 'fontSize');
    setupDragControl(lineHeightControl, 'lineHeight');
}

function setupDragControl(element, type) {
    let isDragging = false;
    let startY = 0;
    let startValue = 0;
    
    // Mouse events
    element.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events
    element.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    
    function startDrag(e) {
        e.preventDefault();
        isDragging = true;
        element.classList.add('dragging');
        
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        startY = clientY;
        
        if (type === 'fontSize') {
            startValue = currentFontSize;
        } else if (type === 'lineHeight') {
            startValue = currentLineHeight;
        }
        
        document.body.style.cursor = 'ns-resize';
    }
    
    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const deltaY = startY - clientY; // Inverted: up = positive, down = negative
        
        if (type === 'fontSize') {
            const sensitivity = 0.5; // pixels per pixel of mouse movement
            const newValue = Math.max(12, Math.min(32, startValue + (deltaY * sensitivity)));
            currentFontSize = newValue;
            
            const lyricsPanel = document.getElementById('lyricsPanel');
            lyricsPanel.style.fontSize = currentFontSize + 'px';
            
        } else if (type === 'lineHeight') {
            const sensitivity = 0.005; // line height units per pixel of mouse movement
            const newValue = Math.max(1.0, Math.min(2.5, startValue + (deltaY * sensitivity)));
            currentLineHeight = newValue;
            
            const lyricsPanel = document.getElementById('lyricsPanel');
            lyricsPanel.style.lineHeight = currentLineHeight;
        }
    }
    
    function endDrag(e) {
        if (!isDragging) return;
        
        isDragging = false;
        element.classList.remove('dragging');
        document.body.style.cursor = '';
    }
}

function hideControls(){
  if (isMobile()){
    const mobileControl = document.getElementById('playlistDropdown');
    mobileControl.classList.remove('show');
  }

}
// Setup swipe support for mobile
function setupSwipeSupport() {
    const contentWrapper = document.getElementById('contentWrapper');
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    
    contentWrapper.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    contentWrapper.addEventListener('touchend', function(e) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
        handleSwipe();
    }, { passive: true });
    
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
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY < 0) {
                // Swipe up - next section
                scrollToSection(1);
            } else {
                // Swipe down - previous section
                scrollToSection(-1);
            }
        }
    }
}
