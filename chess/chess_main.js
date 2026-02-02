import { AI } from './ai.js'; // チェス用のAIロジック

// --- グローバル変数管理 ---
let board = [];
let capturedByWhite = []; // プレイヤーが取った駒
let capturedByBlack = []; // AIが取った駒
let currentTurn = 'white'; // チェスは白（プレイヤー）から開始
let selectedPiece = null;
let validMoves = [];
let isAiThinking = false;

const moveSound = new Audio('../assets/将棋の駒を打つ.mp3'); 
moveSound.load();

const urlParams = new URLSearchParams(window.location.search);
let difficulty = urlParams.get('diff') || 'normal';

document.addEventListener('DOMContentLoaded', () => {
    initializeBoard();
});

// --- 1. 初期化 (8x8 盤面) ---
function initializeBoard() {
    currentTurn = 'white';
    selectedPiece = null;
    validMoves = [];
    capturedByWhite = [];
    capturedByBlack = [];
    updateCapturedDisplay()
    
    // 8x8の初期配置
    board = Array.from({ length: 8 }, () => Array(8).fill(null));

    const layout = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']; // ルーク, ナイト, ビショップ...
    
    // AI (黒) の配置
    for (let i = 0; i < 8; i++) {
        board[0][i] = { type: layout[i], owner: 'black', moved: false };
        board[1][i] = { type: 'P', owner: 'black', moved: false }; // ポーン
    }
    
    // プレイヤー (白) の配置
    for (let i = 0; i < 8; i++) {
        board[6][i] = { type: 'P', owner: 'white', moved: false }; // ポーンにも追加
        board[7][i] = { type: layout[i], owner: 'white', moved: false }; // ここも！
    }

    renderBoard();
}

// --- 2. 描画処理 ---
function renderBoard() {
    const boardElement = document.getElementById('chess-board');
    const turnDisplay = document.getElementById('current-turn-display'); // ターン表示用
    if (!boardElement) return;
    boardElement.innerHTML = '';

    // ターン表示の更新
    if (turnDisplay) {
        turnDisplay.innerText = currentTurn === 'white' ? 'あなたの番 (白)' : 'AIの思考中... (黒)';
        turnDisplay.className = currentTurn === 'white' ? 'turn-white' : 'turn-black';
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            const isDark = (row + col) % 2 === 1;
            cell.className = `chess-cell ${isDark ? 'dark' : 'light'}`;
            
            // CSSのクラス名に合わせる
            if (selectedPiece && selectedPiece.r === row && selectedPiece.c === col) cell.classList.add('selected');
            if (validMoves.some(m => m.r === row && m.c === col)) cell.classList.add('possible-move'); // 修正

            cell.onclick = () => handleCellClick(row, col);

            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                // クラス名を 'white-p' のように小文字に変換して適用
                pieceElement.className = `piece ${piece.owner}-${piece.type.toLowerCase()}`;
                cell.appendChild(pieceElement);
            }
            boardElement.appendChild(cell);
        }
    }
}

// --- 3. プレイヤーの操作 ---
function handleCellClick(row, col) {
    if (currentTurn !== 'white' || isAiThinking) return; // AIが考え中なら無視
    if (currentTurn !== 'white') return;
    const target = board[row][col];

    if (selectedPiece) {
        // 移動先をクリックした場合
        if (validMoves.some(m => m.r === row && m.c === col)) {
            executeMove(selectedPiece.r, selectedPiece.c, row, col);
            selectedPiece = null; // 選択を解除
            validMoves = [];      // 移動候補を空にする
            finishPlayerTurn();
        } else {
            // 自分の別の駒を選び直し
            selectedPiece = null;
            validMoves = [];
            if (target && target.owner === 'white') selectPiece(row, col);
            else renderBoard();
        }
    } else if (target && target.owner === 'white') {
        selectPiece(row, col);
    } 
}

function selectPiece(row, col) {
    selectedPiece = { r: row, c: col };
    // ここで駒ごとの移動可能範囲を計算（AI.jsのロジックと共有すると楽です）
    validMoves = AI.getValidMovesForPiece(row, col, board);
    renderBoard();
}

function executeMove(fR, fC, tR, tC) {
    moveSound.currentTime = 0;
    moveSound.play();
    
    const capturedPiece = board[tR][tC];
    if (capturedPiece) {
        // 現在のターンのプレイヤーが駒を獲得
        if (currentTurn === 'white') {
            capturedByWhite.push(capturedPiece);
        } else {
            capturedByBlack.push(capturedPiece);
        }
        updateCapturedDisplay(); // 表示を更新（手順3で作ります）
    }

    let piece = board[fR][fC];
    piece.moved = true;

    // ポーンのクイーン昇格（ここも入れておくと良いです）
    if (piece.type === 'P' && (tR === 0 || tR === 7)) {
        piece.type = 'Q';
    }

    board[tR][tC] = piece;
    board[fR][fC] = null;
}

function finishPlayerTurn() {
    currentTurn = 'black';
    isAiThinking = true; // AI思考開始！
    renderBoard();
    if (!checkGameOver()) {
        setTimeout(aiMove, 600);
    }
}

function aiMove() {
    const bestMove = AI.findBestMove(difficulty, board, 'black');
    if (bestMove) {
        const fR = bestMove.from[0];
        const fC = bestMove.from[1];
        const tR = bestMove.to[0];
        const tC = bestMove.to[1];
        executeMove(fR, fC, tR, tC);
    }
    isAiThinking = false;
    currentTurn = 'white';
    renderBoard();
    checkGameOver();
}


function updateCapturedDisplay() {
    const whiteBox = document.getElementById('white-captured');
    const blackBox = document.getElementById('black-captured');

    if (whiteBox) {
        // 白の持ち駒を表示（中身は黒の駒）
        whiteBox.innerHTML = capturedByWhite.map(p => 
            `<div class="piece ${p.owner}-${p.type.toLowerCase()}" style="width:30px; height:30px; display:inline-block; margin:2px;"></div>`
        ).join('');
    }
    if (blackBox) {
        // 黒の持ち駒を表示（中身は白の駒）
        blackBox.innerHTML = capturedByBlack.map(p => 
            `<div class="piece ${p.owner}-${p.type.toLowerCase()}" style="width:30px; height:30px; display:inline-block; margin:2px;"></div>`
        ).join('');
    }
}

// --- 5. ゲーム終了判定 (キングが取られたか) ---
function checkGameOver() {
    const pieces = board.flat();
    const whiteKing = pieces.find(p => p?.type === 'K' && p.owner === 'white');
    const blackKing = pieces.find(p => p?.type === 'K' && p.owner === 'black');

    if (!whiteKing || !blackKing) {
        const overlay = document.getElementById('game-result-overlay');
        const statusText = document.querySelector('.final-status');
        if (overlay && statusText) {
            statusText.innerText = !whiteKing ? 'LOSE (AIの勝ち)' : 'WIN (あなたの勝ち！)';
            overlay.style.display = 'flex';
        } else {
            alert(!whiteKing ? 'AIの勝ちです！' : 'あなたの勝ちです！');
        }
        return true;
    }
    return false;
}