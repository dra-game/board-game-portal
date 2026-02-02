import { AI } from '../ai/ai.js';

let board = [];
let currentTurn = 'player';
let selectedPiece = null;
let playerCaptured = [];
let aiCaptured = [];
let selectedCapturedPiece = null;
let validMoves = [];

const komaSound = new Audio('../assets/将棋の駒を打つ.mp3'); 
komaSound.load();

const urlParams = new URLSearchParams(window.location.search);
let difficulty = urlParams.get('diff') || 'normal'; 

console.log("現在の難易度:", difficulty);

document.addEventListener('DOMContentLoaded', () => {
    initializeBoard();
});

// 初期化などはそのまま
function initializeBoard() {
  currentTurn = 'player';
  playerCaptured = []; 
  aiCaptured = [];
  board = [
    [{ type: '銀', owner: 'ai' }, { type: '金', owner: 'ai' }, { type: '王', owner: 'ai' }, { type: '金', owner: 'ai' }, { type: '銀', owner: 'ai' }],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [{ type: '銀', owner: 'player' }, { type: '金', owner: 'player' }, { type: '王', owner: 'player' }, { type: '金', owner: 'player' }, { type: '銀', owner: 'player' }]
  ];
  renderBoard();
  renderCapturedPieces();
}

function setDifficulty(level) {
  difficulty = level;
}

// 描画処理などはそのまま
function renderBoard() {
  const boardElement = document.getElementById('board');
  if (!boardElement) return;
  boardElement.innerHTML = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.onclick = () => handleCellClick(row, col);
      if (selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col) cell.classList.add('selected');
      if (validMoves.includes(`${row},${col}`)) cell.classList.add('highlight');

      const piece = board[row][col];
      if (piece) {
        const pieceElement = document.createElement('div');
        const pieceType = piece.type === '王' ? 'ou' : piece.type === '金' ? 'kin' : 'gin';
        const ownerClass = piece.owner === 'ai' ? 'ai-piece' : 'player-piece';
        pieceElement.className = `${ownerClass} piece-${pieceType}`;
        cell.appendChild(pieceElement); // マスの中に駒を入れる
      }
      boardElement.appendChild(cell);
    }
  }
}

function renderCapturedPieces() {
  const playerArea = document.getElementById('playerCaptured');
  playerArea.innerHTML = '';
  playerCaptured.forEach((type, index) => {
    const piece = document.createElement('div');
    piece.className = `captured-piece captured-${type === '王' ? 'ou' : type === '金' ? 'kin' : 'gin'}`;
    if (selectedCapturedPiece && selectedCapturedPiece.index === index) piece.classList.add('captured-selected');
    piece.onclick = () => {
      selectedCapturedPiece = { type, index };
      selectedPiece = null;
      validMoves = [];
      renderBoard();
      renderCapturedPieces();
    };
    playerArea.appendChild(piece);
  });

  const aiArea = document.getElementById('aiCaptured');
  aiArea.innerHTML = '';
  aiCaptured.forEach((type) => {
    const piece = document.createElement('div');
    piece.className = `captured-piece captured-${type === '王' ? 'ou' : type === '金' ? 'kin' : 'gin'} ai-piece`;
    aiArea.appendChild(piece);
  });
}

// プレイヤー用の移動判定
function isValidMove(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  if (!piece || piece.owner !== 'player') return false;
  const target = board[toRow]?.[toCol];
  if (target && target.owner === 'player') return false;

  const directions = {
    '王': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
    '金': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,0]],
    '銀': [[-1,-1],[-1,0],[-1,1],[1,-1],[1,1]]
  };
  return directions[piece.type]?.some(([dr, dc]) => dr === (toRow - fromRow) && dc === (toCol - fromCol));
}

// --- AI 思考の呼び出し ---
function aiMove() {
  if (currentTurn !== 'ai') return;

  const boardElement = document.getElementById('board');
  boardElement.style.pointerEvents = 'none';

  // AI.js に計算を依頼（前回提案した findBestMove を使用）
  setTimeout(() => {
    const bestMove = AI.findBestMove(difficulty, board, playerCaptured, aiCaptured);
    if (bestMove) {
      executeMove(bestMove);
    }

    boardElement.style.pointerEvents = 'auto'; 
  }, 50);
}

function playKomaSound() {
    komaSound.currentTime = 0; // 連続再生に対応（再生位置を頭に戻す）
    komaSound.play().catch(e => console.log("音声再生待ち:", e));
}

// AIが決定した手を盤面に反映する関数
function executeMove(move) {
  playKomaSound(); // 定義だけでなくここで呼び出す
  if (move.type === 'move') {
    const [fR, fC] = move.from;
    const [tR, tC] = move.to;
    const target = board[tR][tC];
    if (target && target.owner === 'player') aiCaptured.push(target.type);
    board[tR][tC] = board[fR][fC];
    board[fR][fC] = null;
  } else {
    const [r, c] = move.position;
    board[r][c] = { type: move.pieceType, owner: 'ai' };
    aiCaptured.splice(move.index, 1);
  }

  currentTurn = 'player';
  renderBoard();
  renderCapturedPieces();
  setTimeout(() => checkGameOver(), 100);
}

// プレイヤーの操作ロジック
function handleCellClick(row, col) {
  if (currentTurn !== 'player') return;
  const targetPiece = board[row][col];

  if (selectedCapturedPiece && targetPiece === null) {
    playKomaSound();
    board[row][col] = { type: selectedCapturedPiece.type, owner: 'player' };
    playerCaptured.splice(selectedCapturedPiece.index, 1);
    selectedCapturedPiece = null;
    finishPlayerTurn();
    return;
  }

  if (selectedPiece) {
    const [selR, selC] = selectedPiece;
    if (isValidMove(selR, selC, row, col)) {
      playKomaSound();
      if (targetPiece && targetPiece.owner === 'ai') playerCaptured.push(targetPiece.type);
      board[row][col] = board[selR][selC];
      board[selR][selC] = null;
      selectedPiece = null;
      finishPlayerTurn();
    } else {
      selectedPiece = null;
      validMoves = [];
      if (targetPiece && targetPiece.owner === 'player') {
        selectBoardPiece(row, col);
      } else {
        renderBoard();
      }
    }
  } else if (targetPiece && targetPiece.owner === 'player') {
    selectedCapturedPiece = null; 
    renderCapturedPieces(); 
    
    selectBoardPiece(row, col);
  }
}

function selectBoardPiece(row, col) {
  selectedPiece = [row, col];
  validMoves = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (isValidMove(row, col, r, c)) validMoves.push(`${r},${c}`);
    }
  }
  renderBoard();
}

function finishPlayerTurn() {
  validMoves = [];
  currentTurn = 'ai';

  selectedPiece = null;
  selectedCapturedPiece = null;

  renderBoard();
  renderCapturedPieces();
  if (!checkGameOver()) {
    setTimeout(aiMove, 500);
  }
}

function checkGameOver() {
  let pK = false, aK = false;
  board.flat().forEach(p => {
    if (p?.type === '王') {
      if (p.owner === 'player') pK = true;
      if (p.owner === 'ai') aK = true;
    }
  });

  if (!pK || !aK) {
    selectedPiece = null;      // 選択解除
    selectedCapturedPiece = null;
    validMoves = [];           // ハイライト解除
    renderBoard();             // 最後の状態を再描画

    const overlay = document.getElementById('game-result-overlay');
    const message = document.getElementById('result-message');

    // 画面を表示
    overlay.style.display = 'flex';

    // 勝敗に応じたメッセージを設定
    if (!pK) {
      message.innerText = 'AIの勝ちです！';
      message.style.color = '#555'; // 負けた時は少し落ち着いた色に
    } else {
      message.innerText = 'あなたの勝ちです！';
      message.style.color = '#d9534f'; // 勝った時は鮮やかな赤に
    }

    currentTurn = 'none';
    return true;
  }
  return false;
}



// リザルト画面を閉じて設定に戻る関数
window.closeResultAndBack = function() {
  const overlay = document.getElementById('game-result-overlay');
  if (overlay) overlay.style.display = 'none';

  location.href = '../index.html';
  
  // HTML側で定義した showSection を呼び出す
  if (typeof showSection === "function") {
    showSection('top-page');
  }
};
window.restartGame = function() {
  const overlay = document.getElementById('game-result-overlay');
  if (overlay) overlay.style.display = 'none';
  initializeBoard(); // 盤面をリセットしてそのまま再開
};
window.setDifficulty = setDifficulty;
window.initializeBoard = initializeBoard;