// chess/ai.js

export const AI = {
  // 1. 駒の価値
  pieceValues: { 'K': 50000, 'Q': 900, 'R': 500, 'B': 330, 'N': 320, 'P': 100 },

  // 2. 位置価値（中央支配）
  positionValue(row, col) {
    const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    return 10 - centerDist; 
  },

  // 3. 総合評価関数
  evaluateBoard(boardState) {
    let score = 0;
    let whiteKing = false;
    let blackKing = false;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (piece) {
          if (piece.type === 'K') {
            if (piece.owner === 'white') whiteKing = true;
            if (piece.owner === 'black') blackKing = true;
          }
          const value = this.pieceValues[piece.type] || 0;
          const posVal = this.positionValue(row, col);
          const totalValue = value + posVal;
          score += piece.owner === 'black' ? totalValue : -totalValue;
        }
      }
    }
    
    // 勝利確定の判定（将棋の詰み判定を継承）
    if (!whiteKing) return 100000; // AIの勝利
    if (!blackKing) return -100000; // プレイヤーの勝利
    return score;
  },

  // 4. 合法手の取得
  getValidMovesForPiece(row, col, board) {
    const piece = board[row][col];
    if (!piece) return [];
    const moves = [];
    const isWhite = piece.owner === 'white';
    
    const directions = {
      'K': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
      'N': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
      'R': [[-1,0],[1,0],[0,-1],[0,1]],
      'B': [[-1,-1],[-1,1],[1,-1],[1,1]],
      'Q': [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
    };

    if (piece.type === 'P') {
      const forward = isWhite ? -1 : 1;
      const startRow = isWhite ? 6 : 1;
      
      // 1歩前進（前が空なら）
      if (board[row + forward]?.[col] === null) {
        moves.push({ r: row + forward, c: col });
        // 初手2歩前進（1歩目も2歩目も空なら）
        if (row === startRow && board[row + (forward * 2)]?.[col] === null) {
          moves.push({ r: row + (forward * 2), c: col });
        }
      }
      // 斜め前の敵を取る
      [[-1, -1], [-1, 1]].forEach(([dr, dc]) => {
        const forward = isWhite ? -1 : 1;
        const tr = row + forward;
        const tc = col + dc;
        if (board[tr]?.[tc] && board[tr][tc].owner !== piece.owner) {
          moves.push({ r: tr, c: tc });
        }
      });
    } else {
      const isSlide = ['R', 'B', 'Q'].includes(piece.type);
      for (const [dr, dc] of directions[piece.type]) {
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const target = board[r][c];
          if (!target) {
            moves.push({ r, c });
            if (!isSlide) break;
          } else {
            if (target.owner !== piece.owner) moves.push({ r, c });
            break;
          }
          r += dr; c += dc;
        }
      }
    }
    return moves;
  },

  // 以降の generateAllMoves, findBestMove, alphabeta 等は変更なしでOK
  // (現在の実装で将棋のロジックが完璧に引き継がれています)

  generateAllMoves(owner, board) {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.owner === owner) {
          this.getValidMovesForPiece(r, c, board).forEach(m => {
            allMoves.push({ from: [r, c], to: [m.r, m.c] });
          });
        }
      }
    }
    return allMoves;
  },

  applyMove(move, board) {
    const newBoard = board.map(row => [...row]);
    const [fR, fC] = move.from;
    const [tR, tC] = move.to;
    newBoard[tR][tC] = newBoard[fR][fC];
    newBoard[fR][fC] = null;
    return newBoard;
  },

  findBestMove(difficulty, board) {
    if (difficulty === 'easy') return this.calculateEasyMove(board);
    if (difficulty === 'normal') return this.calculateNormalMove(board);
    return this.calculateHardMove(board);
  },

  calculateEasyMove(board) {
    const moves = this.generateAllMoves('black', board);
    const ratedMoves = moves.map(m => ({ move: m, score: this.evaluateBoard(this.applyMove(m, board)) }));
    ratedMoves.sort((a, b) => a.score - b.score);
    if (Math.random() < 0.3) {
      const index = Math.floor(Math.random() * Math.min(3, ratedMoves.length));
      return ratedMoves[index].move;
    }
    return this.calculateNormalMove(board);
  },

  calculateNormalMove(board) {
    let bestScore = -Infinity;
    let bestMove = null;
    const moves = this.generateAllMoves('black', board);
    for (const m of moves) {
      const score = this.evaluateBoard(this.applyMove(m, board));
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }
    return bestMove;
  },

  calculateHardMove(board) {
    let bestScore = -Infinity;
    let bestMove = null;
    const moves = this.generateAllMoves('black', board);
    moves.sort((a, b) => (board[b.to[0]][b.to[1]] ? 1 : 0) - (board[a.to[0]][a.to[1]] ? 1 : 0));
    for (const m of moves) {
      const score = this.alphabeta(this.applyMove(m, board), 3, -Infinity, Infinity, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }
    return bestMove;
  },

  alphabeta(board, depth, alpha, beta, isMaximizing) {
    // evaluateBoard側で勝利判定を行うため、ここではdepthのみをチェック
    if (depth === 0) return this.evaluateBoard(board);

    // 途中でどちらかの王が消えていた場合は早期リターン
    const currentScore = this.evaluateBoard(board);
    if (Math.abs(currentScore) > 50000) return currentScore;

    if (isMaximizing) {
      let maxEval = -Infinity;
      const moves = this.generateAllMoves('black', board);
      for (const m of moves) {
        const score = this.alphabeta(this.applyMove(m, board), depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const moves = this.generateAllMoves('white', board);
      for (const m of moves) {
        const score = this.alphabeta(this.applyMove(m, board), depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
};