const SHEET_ID = '1Vn-d8M-Onw8A5AwJPALfriG9hE2Tzw2SNE8NuLBH_WA';
const API_KEY = 'AIzaSyBVB3RaxSJOpYHJtt4GKVZb0ABK7zR1CnY';

let words = [];
let currentIndex = 0;
let isSequential = true;
let showingEnglish = true;
let understoodWords = [];
let displayedWords = [];

// ページが読み込まれたときにGoogle Sheetsから単語リストをロード
document.addEventListener('DOMContentLoaded', () => {
    loadWordsFromGoogleSheets();

    document.getElementById('updateButton').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('wordDisplay').addEventListener('click', toggleWord);
    document.getElementById('understoodButton').addEventListener('click', markAsUnderstood);
    document.getElementById('orderToggle').addEventListener('click', toggleOrder);
    document.getElementById('restartButton').addEventListener('click', restartApp);
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
            words = data.values.map(row => ({ english: row[0], japanese: row[1] }));
            displayedWords = Array(words.length).fill(false);
            document.getElementById('orderToggle').style.display = 'block';
            document.getElementById('wordDisplay').textContent = 'クリックしてスタート';
            document.getElementById('updateButton').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading data from Google Sheets:', error);  // エラーメッセージを表示
        });
}

function handleFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        words = excelData.map(row => ({ english: row[0], japanese: row[1] }));
        displayedWords = Array(words.length).fill(false);
        localStorage.setItem('words', JSON.stringify(words));

        document.getElementById('orderToggle').style.display = 'block';
        document.getElementById('wordDisplay').textContent = 'クリックしてスタート';
        document.getElementById('updateButton').style.display = 'block';
    };

    reader.readAsArrayBuffer(file);
}

function toggleWord() {
    if (words.length === 0) return;

    const wordDisplay = document.getElementById('wordDisplay');
    const understoodButton = document.getElementById('understoodButton');

    if (showingEnglish) {
        wordDisplay.textContent = words[currentIndex].english;
        speakWord(words[currentIndex].english);
        showingEnglish = false;
        understoodButton.style.display = 'block';
    } else {
        wordDisplay.textContent = words[currentIndex].japanese;
        showingEnglish = true;
        understoodButton.style.display = 'none';

        displayedWords[currentIndex] = true;
        if (displayedWords.every(displayed => displayed)) {
            displaySummaryScreen();
            return;
        }

        if (isSequential) {
            do {
                currentIndex = (currentIndex + 1) % words.length;
            } while (understoodWords.includes(currentIndex) || displayedWords[currentIndex]);
        } else {
            do {
                currentIndex = Math.floor(Math.random() * words.length);
            } while (understoodWords.includes(currentIndex) || displayedWords[currentIndex]);
        }
    }
}

function toggleOrder() {
    isSequential = !isSequential;
    const orderText = isSequential ? "順番通り" : "ランダム";
    document.getElementById('orderToggle').textContent = `表示順序: ${orderText}`;
}

function markAsUnderstood() {
    if (!understoodWords.includes(currentIndex)) {
        understoodWords.push(currentIndex);
    }
    toggleWord();
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
            wordDiv.querySelector('button').textContent = understoodWords.includes(index) ? '解除' : '理解した';
        });

        summaryContent.appendChild(wordDiv);
    });
    
    document.getElementById('summaryScreen').style.display = 'block';
    document.getElementById('wordDisplay').style.display = 'none';
    document.getElementById('understoodButton').style.display = 'none';
    document.getElementById('orderToggle').style.display = 'none';
}

function restartApp() {
    currentIndex = 0;
    showingEnglish = true;
    displayedWords = Array(words.length).fill(false);
    document.getElementById('summaryScreen').style.display = 'none';
    document.getElementById('wordDisplay').style.display = 'block';
    document.getElementById('orderToggle').style.display = 'block';
    document.getElementById('wordDisplay').textContent = 'クリックしてスタート';
}

function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}
