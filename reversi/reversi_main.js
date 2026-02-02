import { AI } from './ai.js';

// --- グローバル変数管理 ---
let board = [];
let currentTurn = 'black'; // 黒（プレイヤー）から開始
const putSound = new Audio('../assets/将棋の駒を打つ.mp3');
putSound.load();

// URLパラメータから難易度を取得（ポータルからの引き継ぎ）
const urlParams = new URLSearchParams(window.location.search);
let difficulty = urlParams.get('diff') || 'normal';

document.addEventListener('DOMContentLoaded', () => {
    initializeBoard();
});

// --- 1. 初期化 ---
function initializeBoard() {
    currentTurn = 'black';
    // 8x8の盤面を空（null）で生成
    board = Array.from({ length: 8 }, () => Array(8).fill(null));

    // リバーシの標準初期配置
    board[3][3] = 'white';
    board[3][4] = 'black';
    board[4][3] = 'black';
    board[4][4] = 'white';

    renderBoard();
    updateUI();
}

// --- 2. 描画処理 ---
function renderBoard() {
    const boardElement = document.getElementById('reversi-board');
    if (!boardElement) return;
    boardElement.innerHTML = '';

    const playableMoves = getValidMoves(currentTurn);

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.className = 'reversi-cell';
            
            const stoneColor = board[row][col];
            if (stoneColor) {
                const stone = document.createElement('div');
                stone.className = `stone stone-${stoneColor}`;
                cell.appendChild(stone);
            } else if (currentTurn === 'black' && playableMoves.some(m => m.r === row && m.c === col)) {
                // プレイヤーの置ける場所をハイライトし、クリック可能にする
                cell.classList.add('highlight-move');
                cell.onclick = () => handleCellClick(row, col);
            }
            boardElement.appendChild(cell);
        }
    }
}

// --- 3. UI（スコア・手番）更新 ---
function updateUI() {
    const blackCount = board.flat().filter(s => s === 'black').length;
    const whiteCount = board.flat().filter(s => s === 'white').length;
    
    document.getElementById('black-count').innerText = blackCount;
    document.getElementById('white-count').innerText = whiteCount;

    const turnDisplay = document.getElementById('current-turn-display');
    turnDisplay.innerText = currentTurn === 'black' ? '黒' : '白';
    turnDisplay.className = currentTurn === 'black' ? 'turn-black' : 'turn-white';
}

// --- 4. プレイヤーの操作 ---
async function handleCellClick(row, col) {
    if (currentTurn !== 'black') return;

    // ひっくり返す座標のリストを取得（盤面はまだ書き換えない）
    const flipped = getFlippedPositions(row, col, 'black');
    
    if (flipped.length > 0) {
        // 1. 自分の石を置く
        board[row][col] = 'black';
        putSound.currentTime = 0;
        putSound.play();
        renderBoard();

        // 2. 相手の石をアニメーション付きでひっくり返す
        await animateFlip(flipped, 'black');
        
        // 3. ターンをAIに交代
        changeTurn('white');
    }
}

// --- 5. AIの思考と操作 ---
async function aiMove() {
    if (currentTurn !== 'white') return;

    // AI.jsから最善手を取得
    const bestMove = AI.findBestMove(difficulty, board);
    
    if (bestMove) {
        const flipped = getFlippedPositions(bestMove.r, bestMove.c, 'white');
        
        // AIの石を置く
        board[bestMove.r][bestMove.c] = 'white';
        putSound.currentTime = 0;
        putSound.play();
        renderBoard();

        // AIのひっくり返しもアニメーションさせる
        await animateFlip(flipped, 'white');
        
        changeTurn('black');
    } else {
        // どこにも置けない場合はパス
        changeTurn('black');
    }
}

// --- 6. ターン交代・終了・パスの判定 ---
function changeTurn(nextColor) {
    currentTurn = nextColor;
    const nextMoves = getValidMoves(currentTurn);

    if (nextMoves.length === 0) {
        const opponentColor = currentTurn === 'black' ? 'white' : 'black';
        const opponentMoves = getValidMoves(opponentColor);

        if (opponentMoves.length === 0) {
            // 両者打てないなら終了
            renderBoard();
            updateUI();
            setTimeout(showResult, 500);
            return;
        } else {
            // パス処理
            alert(`${currentTurn === 'black' ? '黒' : '白'}は置ける場所がないのでパスします`);
            currentTurn = opponentColor;
        }
    }
    
    renderBoard();
    updateUI();

    // AIの番なら思考開始
    if (currentTurn === 'white') {
        setTimeout(aiMove, 600); 
    }
}

// --- 7. アニメーション演出 ---
async function animateFlip(flippedStones, color) {
    const cells = document.getElementsByClassName('reversi-cell');
    for (const pos of flippedStones) {
        // 0.08秒ずつズラして連鎖感を出す
        await new Promise(resolve => setTimeout(resolve, 80));
        const stone = cells[pos.r * 8 + pos.c].querySelector('.stone');
        
        if (stone) {
            stone.classList.add('flip'); 
            
            // アニメーションの半分のタイミングで色を物理的に変える
            setTimeout(() => {
                board[pos.r][pos.c] = color;
                stone.className = `stone stone-${color} flip`;
                updateUI();
            }, 300);
        }
    }
    // 全アニメーション終了まで待機
    await new Promise(resolve => setTimeout(resolve, 400));
}

// --- 8. コアロジック（座標計算） ---
// 石を置いたとき、ひっくり返る石の座標リストを返す
function getFlippedPositions(row, col, color) {
    const opponent = color === 'black' ? 'white' : 'black';
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    let totalFlipped = [];

    if (board[row][col] !== null) return [];

    directions.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;
        let candidate = [];

        while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
            candidate.push({ r, c });
            r += dr;
            c += dc;
        }

        if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === color) {
            totalFlipped = totalFlipped.concat(candidate);
        }
    });
    return totalFlipped;
}

function getValidMoves(color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getFlippedPositions(r, c, color).length > 0) {
                moves.push({ r, c });
            }
        }
    }
    return moves;
}

// --- 9. 結果表示 ---
function showResult() {
    const blackCount = board.flat().filter(s => s === 'black').length;
    const whiteCount = board.flat().filter(s => s === 'white').length;
    
    const overlay = document.getElementById('game-result-overlay');
    const message = document.getElementById('result-message');
    
    overlay.style.display = 'flex';
    document.getElementById('final-black').innerText = `黒: ${blackCount}`;
    document.getElementById('final-white').innerText = `白: ${whiteCount}`;

    if (blackCount > whiteCount) {
        message.innerText = 'あなたの勝ちです！';
        message.style.color = '#d9534f';
    } else if (whiteCount > blackCount) {
        message.innerText = 'AIの勝ちです！';
        message.style.color = '#555';
    } else {
        message.innerText = '引き分けです！';
        message.style.color = '#fff';
    }
}

// グローバル関数をwindowに登録
window.restartGame = initializeBoard;