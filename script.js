// ChordPro Viewer JavaScript
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
    initializeClock();
    setupFileInput();
    updateNextButton();
});

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
    dropdown.classList.toggle('show');
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target)) {
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
    
    currentIndex = index;
    const song = playlist[currentIndex];
    console.log('Loading song:', song);
    
    // Update lyrics panel
    const lyricsPanel = document.getElementById('lyricsPanel');
    lyricsPanel.innerHTML = formatChordProSong(song);
    
    // Reset scroll position to top
    const contentWrapper = document.getElementById('contentWrapper');
    contentWrapper.scrollTop = 0;
    
    // Update song info
    updateSongInfo(song);
    updateNextButton();
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
    
    // Replace chord notation [C] with styled spans - remove spaces around chords
    formatted = formatted.replace(/\s*\[([^\]]+)\]\s*/g, '<span class="chord">$1</span>');
    
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
    
    // Try different possible column names
    const title = song.title || song.name || song.song || song.songname || 'Unknown Title';
    const key = song.key || song.songkey || song.chord_key || '';
    const tempo = song.tempo || song.bpm || song.speed || '';
    const duration = song.duration || song.length || song.time || '';
    
    let metadataHtml = '';
    if (key) metadataHtml += `Key: ${key}<br>`;
    if (tempo) metadataHtml += `Tempo: ${tempo}<br>`;
    if (duration) {
        const formattedDuration = formatDuration(duration);
        if (formattedDuration) metadataHtml += `Duration: ${formattedDuration}`;
    }
    
    infoBox.innerHTML = `
        <div class="song-title">${title}</div>
        <div class="song-counter"><strong>${currentIndex + 1} of ${playlist.length}</strong></div>
        <div class="song-metadata">${metadataHtml}</div>
    `;
}

// Update next button
function updateNextButton() {
    const nextBtn = document.getElementById('nextBtn');
    const nextTitle = document.getElementById('nextTitle');
    
    if (currentIndex < playlist.length - 1) {
        const nextSong = playlist[currentIndex + 1];
        const title = nextSong.title || nextSong.name || nextSong.song || nextSong.songname || `Song ${currentIndex + 2}`;
        nextTitle.textContent = title;
        nextBtn.style.opacity = '1';
        nextBtn.disabled = false;
    } else {
        nextTitle.textContent = 'End of Playlist';
        nextBtn.style.opacity = '0.5';
        nextBtn.disabled = true;
    }
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
    const scrollBtn = document.getElementById('scrollBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    
    if (isScrolling) {
        // Stop scrolling
        clearInterval(scrollInterval);
        clearTimeout(scrollDelayTimeout);
        isScrolling = false;
        scrollBtn.innerHTML = '<i class="fas fa-play"></i>';
        scrollBtn.style.color = '';
    } else {
        // Check if we're at the top of the song
        if (contentWrapper.scrollTop <= 10) {
            // Add 10 second delay with red indicator
            scrollBtn.innerHTML = '<i class="fas fa-play"></i>';
            scrollBtn.style.color = 'darkred';
            
            scrollDelayTimeout = setTimeout(() => {
                startScrolling();
            }, 10000);
        } else {
            // Start scrolling immediately if not at top
            startScrolling();
        }
        isScrolling = true;
    }
}

// Start the actual scrolling
function startScrolling() {
    const scrollBtn = document.getElementById('scrollBtn');
    const contentWrapper = document.getElementById('contentWrapper');
    
    scrollBtn.innerHTML = '<i class="fas fa-pause"></i>';
    scrollBtn.style.color = '';
    
    scrollInterval = setInterval(() => {
        contentWrapper.scrollTop += 1;
        
        // Check if we've reached the bottom - more precise check
        if (contentWrapper.scrollTop >= contentWrapper.scrollHeight - contentWrapper.clientHeight - 5) {
            // Stop scrolling
            clearInterval(scrollInterval);
            isScrolling = false;
            scrollBtn.innerHTML = '<i class="fas fa-play"></i>';
            
            // Only advance to next song if autoplay is active
            if (isAutoPlay) {
                const autoPlayBtn = document.getElementById('autoPlayBtn');
                autoPlayBtn.style.color = 'darkred';
                
                autoPlayDelayTimeout = setTimeout(() => {
                    autoPlayBtn.style.color = '';
                    if (currentIndex < playlist.length - 1) {
                        loadSong(currentIndex + 1);
                    } else {
                        toggleAutoPlay(); // Stop at end of playlist
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
    
    if (isAutoPlay) {
        clearInterval(autoPlayInterval);
        clearTimeout(autoPlayDelayTimeout);
        isAutoPlay = false;
        autoPlayBtn.innerHTML = '<i class="fas fa-play-circle"></i>';
        autoPlayBtn.style.color = '';
    } else {
        isAutoPlay = true;
        autoPlayBtn.innerHTML = '<i class="fas fa-pause-circle"></i>';
        
        // Start autoplay timer - only advance when not scrolling or when scroll finishes
        autoPlayInterval = setInterval(() => {
            if (!isScrolling) {
                if (currentIndex < playlist.length - 1) {
                    loadSong(currentIndex + 1);
                } else {
                    toggleAutoPlay(); // Stop at end of playlist
                }
            }
        }, 30000); // 30 seconds per song
    }
}
