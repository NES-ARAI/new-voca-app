const SHEET_ID = '1Vn-d8M-Onw8A5AwJPALfriG9hE2Tzw2SNE8NuLBH_WA';
const API_KEY = 'AIzaSyBVB3RaxSJOpYHJtt4GKVZb0ABK7zR1CnY';

let words = [];
let currentIndex = 0;
let isSequential = true;
let showingEnglish = true;
let understoodWords = JSON.parse(localStorage.getItem('understoodWords')) || [];
let isAutoPlay = false;
let displayedWords = []; // 初期化
let remainingIndices = []; // ランダム表示用のインデックスリスト

document.addEventListener('DOMContentLoaded', () => {
    loadWordsFromGoogleSheets();

    document.getElementById('wordDisplay').addEventListener('click', () => {
        if (isAutoPlay) {
            stopAutoPlay();
        } else if (words.length > 0) {
            toggleWordManual();
        }
    });
    document.getElementById('understoodButton').addEventListener('click', markAsUnderstood);
    document.getElementById('orderToggle').addEventListener('click', toggleOrder);
    document.getElementById('restartButton').addEventListener('click', restartApp);
    document.getElementById('autoPlayButton').addEventListener('click', toggleAutoPlay);
    document.getElementById('summaryButton').addEventListener('click', displaySummaryScreen);
});

function loadWordsFromGoogleSheets() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A2:B2000?key=${API_KEY}`;
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
            words = data.values.map(row => ({ english: row[0], japanese: row[1] }));
            displayedWords = Array(words.length).fill(false); // 初期化
            remainingIndices = Array.from(words.keys()); // ランダム表示用のインデックスリストを初期化
            document.getElementById('orderToggle').style.display = 'block';
            document.getElementById('autoPlayButton').style.display = 'block';
            document.getElementById('summaryButton').style.display = 'block';
            document.getElementById('wordDisplay').textContent = 'クリックしてスタート';
            currentIndex = 0; // インデックスを初期化
        })
        .catch(error => {
            console.error('Error loading data from Google Sheets:', error);
        });
}

function toggleWordManual() {
    const wordDisplay = document.getElementById('wordDisplay');
    const understoodButton = document.getElementById('understoodButton');

    if (showingEnglish) {
        wordDisplay.textContent = words[currentIndex].english;
        speakWord(words[currentIndex].english, 'en-US', 1, () => {}, true);
        showingEnglish = false;
    } else {
        wordDisplay.textContent = words[currentIndex].japanese;
        speakWord(words[currentIndex].japanese, 'ja-JP', 2.0, () => {}, true);
        showingEnglish = true;
        displayedWords[currentIndex] = true; // 現在の単語を表示済みとして記録

        if (displayedWords.every((val, idx) => understoodWords.includes(idx) || val)) {
            setTimeout(displaySummaryScreen, 500);
        } else {
            getNextWord();
        }
    }

    understoodButton.style.display = 'block';
}

function getNextWord() {
    window.speechSynthesis.cancel(); // 次の単語に移る前に音声再生をキャンセル
    let previousIndex = currentIndex;
    if (isSequential) {
        do {
            currentIndex = (currentIndex + 1) % words.length;
        } while (understoodWords.includes(currentIndex) && currentIndex !== previousIndex);
    } else {
        remainingIndices = remainingIndices.filter(index => !understoodWords.includes(index));
        if (remainingIndices.length > 0) {
            currentIndex = remainingIndices.splice(Math.floor(Math.random() * remainingIndices.length), 1)[0];
        }
    }

    if (currentIndex === previousIndex) {
        currentIndex = (currentIndex + 1) % words.length;
    }
}

function toggleOrder() {
    isSequential = !isSequential;
    const orderText = isSequential ? "順番通り" : "ランダム";
    document.getElementById('orderToggle').textContent = `表示順序: ${orderText}`;
    currentIndex = 0; // インデックスを初期化して最初からスタート
    displayedWords = Array(words.length).fill(false); // 表示済み単語をリセット
    remainingIndices = Array.from(words.keys()); // ランダム表示用のインデックスリストをリセット
    getNextWord(); // 次の単語を取得
    document.getElementById('wordDisplay').textContent = 'クリックしてスタート'; // 表示をリセット
}

function markAsUnderstood() {
    if (!understoodWords.includes(currentIndex)) {
        understoodWords.push(currentIndex);
        localStorage.setItem('understoodWords', JSON.stringify(understoodWords));
    }
    getNextWord();
    showingEnglish = true;
    toggleWordManual();
}

function displaySummaryScreen() {
    const summaryContent = document.getElementById('summaryContent');
    summaryContent.innerHTML = '';
    words.forEach((word, index) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'summary-item';
        wordDiv.innerHTML = `
            <span>${word.english} - ${word.japanese}</span>
            <button class="understood-toggle">${understoodWords.includes(index) ? '解除' : '理解した'}</button>
        `;
        
        wordDiv.querySelector('.understood-toggle').addEventListener('click', () => {
            if (understoodWords.includes(index)) {
                understoodWords = understoodWords.filter(i => i !== index);
            } else {
                understoodWords.push(index);
            }
            localStorage.setItem('understoodWords', JSON.stringify(understoodWords));
            wordDiv.querySelector('.understood-toggle').textContent = understoodWords.includes(index) ? '解除' : '理解した';
        });

        summaryContent.appendChild(wordDiv);
    });
    
    document.getElementById('summaryScreen').style.display = 'block';
    document.getElementById('wordDisplayContainer').style.display = 'none';
    document.getElementById('understoodButton').style.display = 'none';
    document.getElementById('orderToggle').style.display = 'none';
    document.getElementById('restartButton').style.display = 'block'; // "もう一度"ボタンを表示
    document.getElementById('autoPlayButton').style.display = 'none'; // 自動再生ボタンを非表示
    document.getElementById('summaryButton').style.display = 'none'; // まとめ画面ボタンを非表示
}

function restartApp() {
    currentIndex = 0; // インデックスを初期化
    showingEnglish = true;
    displayedWords = Array(words.length).fill(false); // 表示済み単語をリセット
    remainingIndices = Array.from(words.keys()); // ランダム表示用のインデックスリストを初期化
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('wordDisplayContainer').style.display = 'block';
    document.getElementById('orderToggle').style.display = 'block';
    document.getElementById('understoodButton').style.display = 'none';
    document.getElementById('restartButton').style.display = 'none';
    document.getElementById('autoPlayButton').style.display = 'block';
    document.getElementById('autoPlayButton').textContent = '自動再生'; // ボタン表示を初期化
    document.getElementById('summaryButton').style.display = 'block'; // まとめ画面ボタンを再表示
    document.getElementById('wordDisplay').textContent = 'クリックしてスタート';
    isAutoPlay = false;
    getNextWord(); // 初期化後に次の単語を取得
}

function speakWord(word, lang = 'en-US', rate = 1, onend = null, isManual = false) {
    if (document.getElementById('summaryScreen').style.display === 'block') return; // まとめ画面では音声を再生しない

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = lang;
    utterance.rate = rate; // 速度を指定
    utterance.onend = onend; // 終了時のコールバックを設定
    utterance.onerror = (event) => {
        console.error('Speech error:', event.error);
    };

    if (!isAutoPlay && isManual) {
        window.speechSynthesis.cancel(); // 手動再生の場合、次の単語に移る前に音声再生をキャンセル
    }
    
    window.speechSynthesis.speak(utterance);
}

function toggleAutoPlay() {
    if (isAutoPlay) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
}

function startAutoPlay() {
    isAutoPlay = true;
    document.getElementById('autoPlayButton').textContent = '再生停止';
    autoPlayNextWord();
}

function stopAutoPlay() {
    isAutoPlay = false;
    document.getElementById('autoPlayButton').textContent = '自動再生';
    window.speechSynthesis.cancel(); // 音声再生を停止
}

function autoPlayNextWord() {
    if (!isAutoPlay) return;

    const wordDisplay = document.getElementById('wordDisplay');
    const understoodButton = document.getElementById('understoodButton');

    wordDisplay.textContent = words[currentIndex].english;
    speakWord(words[currentIndex].english, 'en-US', 1, () => {
        wordDisplay.textContent = words[currentIndex].japanese;
        speakWord(words[currentIndex].japanese, 'ja-JP', 2.0, () => {
            displayedWords[currentIndex] = true; // 現在の単語を表示済みとして記録
            if (displayedWords.every((val, idx) => understoodWords.includes(idx) || val)) {
                setTimeout(displaySummaryScreen, 500);
            } else {
                getNextWord();
                autoPlayNextWord(); // 次の英単語を表示する
            }
        });
    });
    understoodButton.style.display = 'block';
}
