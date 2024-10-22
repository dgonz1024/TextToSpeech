// TextToSpeech.js - JavaScript for the browser extension

window.addEventListener('load', () => {
    let isPlaying = false;
    let currentUtterance = null;
    let totalDuration = 0;
    let progressInterval = null;
    let startTime = 0;
    let pausedTime = 0;
    let wordIndex = 0;

    // Create a text-to-speech container
    const container = document.createElement('div');
    container.id = 'tts-container';
    container.innerHTML = `
        <div id="tts-controls">
            <button id="play-pause-btn">
                <i class="fas fa-play"></i>
            </button>
            <span id="current-time">0:00</span>
            <input type="range" id="progress-bar" value="0" max="100">
            <span id="total-time">0:00</span>
            <select id="playback-speed">
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
            </select>
        </div>
    `;
    document.body.appendChild(container);

    // Extract all text from the webpage
    const text = Array.from(document.querySelectorAll('p')).map(p => p.innerText).join(' ');
    const words = text.split(' ');
    setupControls(text);
    function setupControls(text) {
        // Replay button
        const replayButton = document.createElement('button');
        replayButton.id = 'replay-btn';
        replayButton.innerHTML = '<i class="fas fa-redo"></i>';
        replayButton.style.display = 'none';
        replayButton.addEventListener('click', () => {
            pausedTime = 0;
            playSpeech(text);
        });
        document.getElementById('tts-controls').appendChild(replayButton);
        // Play/Pause button functionality
        const playPauseButton = document.getElementById('play-pause-btn');
        playPauseButton.addEventListener('click', () => {
            if (playPauseButton.innerHTML.includes('fa-redo')) {
                pausedTime = 0;
                playSpeech(text);
                playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else if (isPlaying) {
                pauseSpeech();
            } else {
                playSpeech(text);
            }
        });

        // Playback speed selection
        const playbackSpeedSelect = document.getElementById('playback-speed');
        playbackSpeedSelect.addEventListener('change', () => {
            if (currentUtterance) {
                const playbackSpeed = parseFloat(playbackSpeedSelect.value);
                currentUtterance.rate = playbackSpeed;
                if (isPlaying) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }
        });

        // Progress bar seek functionality
        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('input', (e) => {
            if (currentUtterance) {
                const seekTime = (e.target.value / 100) * totalDuration;
                pausedTime = seekTime;
                updateProgressDisplay(seekTime);
                if (isPlaying) {
                    window.speechSynthesis.cancel();
                    playSpeech(text, seekTime);
                }
            }
        });
    }

    // Play speech function
    function playSpeech(text, startFrom = pausedTime) {
        if (currentUtterance) {
            window.speechSynthesis.cancel();
        }
        currentUtterance = new SpeechSynthesisUtterance(text);
        const playbackSpeed = parseFloat(document.getElementById('playback-speed').value);
        currentUtterance.rate = playbackSpeed;
        currentUtterance.onend = () => {
            clearInterval(progressInterval);
            isPlaying = false;
            document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-redo"></i>';
            currentUtterance = null;
        };

        const startWordIndex = Math.floor(startFrom * currentUtterance.rate * 2);
        currentUtterance.text = words.slice(startWordIndex).join(' ');
        wordIndex = startWordIndex;
        pausedTime = startFrom;
        startTime = Date.now();

        currentUtterance.onboundary = (event) => {
            if (event.name === 'word') {
                wordIndex = event.charIndex;
                highlightCurrentWord(event.charIndex);
            }
        };

        window.speechSynthesis.speak(currentUtterance);
        isPlaying = true;
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        startProgressTracking();
    }

    // Pause speech function
    function pauseSpeech() {
        window.speechSynthesis.cancel();
        isPlaying = false;
        pausedTime += (Date.now() - startTime) / 1000;
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
        clearInterval(progressInterval);
    }

    // Start progress tracking
    function startProgressTracking() {
        const progressBar = document.getElementById('progress-bar');
        const currentTimeDisplay = document.getElementById('current-time');
        totalDuration = words.length / (parseFloat(document.getElementById('playback-speed').value) * 2); // Estimate total duration
        document.getElementById('total-time').textContent = formatTime(totalDuration);

        if (progressInterval) {
            clearInterval(progressInterval);
        }

        progressInterval = setInterval(() => {
            if (!isPlaying) return;
            const elapsedTime = pausedTime + (isPlaying ? (Date.now() - startTime) / 1000 : 0);
            if (elapsedTime > totalDuration) {
                clearInterval(progressInterval);
                return;
            }
            updateProgressDisplay(elapsedTime);
            progressBar.value = Math.min((elapsedTime / totalDuration) * 100, 100);
        }, 1000);
    }

    function updateProgressDisplay(elapsedTime) {
        const currentTimeDisplay = document.getElementById('current-time');
        currentTimeDisplay.textContent = formatTime(elapsedTime);
    }

    function highlightCurrentWord(index) {
        const paragraphs = document.querySelectorAll('p');
        let charCount = 0;
        paragraphs.forEach(p => {
            p.innerHTML = p.innerText.replace(/<span class="highlight">(.*?)<\/span>/g, '$1');
            const wordsInParagraph = p.innerText.split(' ');
            wordsInParagraph.forEach((word, i) => {
                if (charCount === index) {
                    wordsInParagraph[i] = `<span class="highlight">${word}</span>`;
                }
                charCount += word.length + 1;
            });
            p.innerHTML = wordsInParagraph.join(' ');
        });
    }

    // Format time in mm:ss
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
});

// Add CSS for the extension UI
const style = document.createElement('style');
style.textContent = `
    #tts-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
        z-index: 1000;
    }
    #tts-controls {
        display: flex;
        align-items: center;
    }
    #progress-bar {
        flex: 1;
        margin: 0 10px;
    }
    #play-pause-btn i {
        font-size: 20px;
    }
    .highlight {
        background-color: yellow;
    }
`;
document.head.appendChild(style);

// Add Font Awesome for play/pause icons
const fontAwesome = document.createElement('link');
fontAwesome.rel = 'stylesheet';
fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
