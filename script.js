const SHEET_ID = '1Vn-d8M-Onw8A5AwJPALfriG9hE2Tzw2SNE8NuLBH_WA';
const API_KEY = 'AIzaSyBVB3RaxSJOpYHJtt4GKVZb0ABK7zR1CnY';

let words = [];
let currentIndex = 0;
let isSequential = true;
let showingEnglish = true;
let understoodWords = JSON.parse(localStorage.getItem('understoodWords')) || [];
let displayedWords = [];

// ページが読み込まれたときにGoogle Sheetsから単語リストをロード
document.addEventListener('DOMContentLoaded', () => {
    loadWordsFromGoogleSheets();

    document.getElementById('wordDisplay').addEventListener('click', () => {
        if (words.length > 0) {
            toggleWord();
        }
    });
    document.getElementById('understoodButton').addEventListener('click', markAsUnderstood);
    document.getElementById('orderToggle').addEventListener('click', toggleOrder);
    document.getElementById('restartButton').addEventListener('click', restartApp);
    document.getElementById('letsStartButton').addEventListener('click', restartApp); // "Let's Start"ボタンにイベントリスナーを追加
});

function loadWordsFromGoogleSheets() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:B1000?key=${API_KEY}`;
    console.log(`Fetching data from URL: ${url}`);  // デバッグ用にURLを表示

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data from Google Sheets:', data);  // デバッグ用にデータを表示
            words = data.values.slice(1).map(row => ({ english: row[0], japanese: row[1] }));
            displayedWords = Array(words.length).fill(false);
            document.getElementById('orderToggle').style.display = 'block';
            document.getElementById('wordDisplay').textContent = 'クリックしてスタート';
        })
        .catch(error => {
            console.error('Error loading data from Google Sheets:', error);  // エラーメッセージを表示
        });
}

function toggleWord() {
    const wordDisplay = document.getElementById('wordDisplay');
    const understoodButton = document.getElementById('understoodButton');

    if (showingEnglish) {
        wordDisplay.textContent = words[currentIndex].english;
        speakWord(words[currentIndex].english);
        showingEnglish = false;
        understoodButton.style.display = 'block';
    } else {
        wordDisplay.textContent = words[currentIndex].japanese;
        speakWord(words[currentIndex].japanese, 'ja-JP', 2.0); // 2倍の速度で日本語を再生
        showingEnglish = true;
        understoodButton.style.display = 'none';

        displayedWords[currentIndex] = true;

        if (displayedWords.filter((val, idx) => !understoodWords.includes(idx)).every(displayed => displayed)) {
            setTimeout(displaySummaryScreen, 500);  // 少し遅延を追加して日本語表示を待つ
        } else {
            getNextWordIndex();
        }
    }
}

function getNextWordIndex() {
    const remainingWords = words.map((_, index) => index).filter(index => !understoodWords.includes(index) && !displayedWords[index]);
    if (remainingWords.length > 0) {
        if (isSequential) {
            currentIndex = remainingWords[0];
        } else {
            currentIndex = remainingWords[Math.floor(Math.random() * remainingWords.length)];
        }
    } else {
        displaySummaryScreen();
    }
}

function toggleOrder() {
    isSequential = !isSequential;
    const orderText = isSequential ? "順番通り" : "ランダム";
    document.getElementById('orderToggle').textContent = `表示順序: ${orderText}`;
    restartApp(); // Reset the app to apply the new order
}

function markAsUnderstood() {
    if (!understoodWords.includes(currentIndex)) {
        understoodWords.push(currentIndex);
        localStorage.setItem('understoodWords', JSON.stringify(understoodWords));
    }
    showingEnglish = true;
    getNextWordIndex(); // Ensure the next word is retrieved correctly
    document.getElementById('wordDisplay').textContent = words[currentIndex].english;
    speakWord(words[currentIndex].english);
}

function displaySummaryScreen() {
    const summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = '';
    words.forEach((word, index) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'summary-item';
        wordDiv.innerHTML = `
            <span>${word.english} - ${word.japanese}</span>
            <button>${understoodWords.includes(index) ? '解除' : '理解した'}</button>
        `;
        
        wordDiv.querySelector('button').addEventListener('click', () => {
            if (understoodWords.includes(index)) {
                understoodWords = understoodWords.filter(i => i !== index);
            } else {
                understoodWords.push(index);
            }
            localStorage.setItem('understoodWords', JSON.stringify(understoodWords));
            wordDiv.querySelector('button').textContent = understoodWords.includes(index) ? '解除' : '理解した';
        });

        summaryContent.appendChild(wordDiv);
    });
    
    document.getElementById('summaryScreen').style.display = 'block';
    document.getElementById('wordDisplay').style.display = 'none';
    document.getElementById('understoodButton').style.display = 'none';
    document.getElementById('orderToggle').style.display = 'none';
    document.getElementById('restartButton').style.display = 'block'; // "Let's Start"ボタンを表示
}

function restartApp() {
    currentIndex = 0;
    showingEnglish = true;
    displayedWords = Array(words.length).fill(false);
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('wordDisplay').style.display = 'block';
    document.getElementById('orderToggle').style.display = 'block';
    document.getElementById('understoodButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('wordDisplay').textContent = 'クリックしてスタート';
}

function speakWord(word, lang = 'en-US', rate = 1) {
    if (document.getElementById('summaryScreen').style.display === 'block') return; // まとめ画面では音声を再生しない

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = rate; // 速度を指定
    utterance.onstart = () => {
        console.log('Speech started');
    };
    utterance.onend = () => {
        console.log('Speech ended');
    };
    utterance.onerror = (event) => {
        console.error('Speech error:', event.error);
    };
    window.speechSynthesis.speak(utterance);
}
