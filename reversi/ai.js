// reversi/ai.js

export const AI = {
  // 盤面のマスの位置価値 (将棋の pieceValues / positionValue に相当)
  cellValues: [
    [100, -20, 10,  5,  5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [ 10,  -2,  5,  1,  1,  5,  -2,  10],
    [  5,  -2,  1,  1,  1,  1,  -2,   5],
    [  5,  -2,  1,  1,  1,  1,  -2,   5],
    [ 10,  -2,  5,  1,  1,  5,  -2,  10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10,  5,  5, 10, -20, 100]
  ],

  // 現在の盤面から総合評価値を計算 (将棋の evaluateBoard に相当)
  evaluateBoard(boardState) {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const stone = boardState[row][col];
        if (stone) {
          const val = this.cellValues[row][col];
          score += stone === 'white' ? val : -val;
        }
      }
    }
    return score;
  },

  // その場所に置けるか判定 (将棋の isValidAIMove に相当)
  isValidAIMove(row, col, board, color) {
    if (board[row][col] !== null) return false;
    const opponent = color === 'black' ? 'white' : 'black';
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

    return directions.some(([dr, dc]) => {
      let r = row + dr, c = col + dc, count = 0;
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === opponent) {
        r += dr; c += dc; count++;
      }
      return count > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === color;
    });
  },

  // 全ての合法手を取得 (将棋の generateAllMoves に相当)
  generateAllMoves(owner, board) {
    const moves = [];
    const color = owner === 'ai' ? 'white' : 'black';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.isValidAIMove(r, c, board, color)) {
          moves.push({ r, c });
        }
      }
    }
    return moves;
  },

  // 仮想的に石を置き、盤面を反転させる (将棋の applyMove に相当)
  applyMove(move, board, currentMovingOwner) {
    const newBoard = board.map(row => [...row]);
    const color = currentMovingOwner === 'ai' ? 'white' : 'black';
    const opponent = color === 'black' ? 'white' : 'black';
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

    const { r: row, c: col } = move;
    newBoard[row][col] = color;

    directions.forEach(([dr, dc]) => {
      let r = row + dr, c = col + dc;
      let flipped = [];
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && newBoard[r][c] === opponent) {
        flipped.push({ r, c });
        r += dr; c += dc;
      }
      if (r >= 0 && r < 8 && c >= 0 && c < 8 && newBoard[r][c] === color) {
        flipped.forEach(p => newBoard[p.r][p.c] = color);
      }
    });
    return newBoard;
  },

  // 最善手を探す (将棋の findBestMove と共通)
  findBestMove(difficulty, board) {
    const moves = this.generateAllMoves('ai', board);
    if (moves.length === 0) return null;

    if (difficulty === 'easy') {
      return this.calculateEasyMove(board);
    } else if (difficulty === 'normal') {
      return this.calculateNormalMove(board);
    } else {
      return this.calculateHardMove(board);
    }
  },

  // 「かんたん」：ランダム要素を加える (将棋の calculateEasyMove を継承)
  calculateEasyMove(board) {
    const aiMoves = this.generateAllMoves('ai', board);
    const ratedMoves = aiMoves.map(move => {
      const newBoard = this.applyMove(move, board, 'ai');
      return { move, score: this.evaluateBoard(newBoard) };
    });

    ratedMoves.sort((a, b) => a.score - b.score);

    if (Math.random() < 0.3) {
      const index = Math.floor(Math.random() * Math.min(3, ratedMoves.length));
      return ratedMoves[index].move;
    }
    return this.calculateNormalMove(board);
  },

  // 「ふつう」 (将棋の calculateNormalMove を継承)
  calculateNormalMove(board) {
    let bestScore = -Infinity;
    let bestMove = null;
    const aiMoves = this.generateAllMoves('ai', board);

    for (const move of aiMoves) {
      const newBoard = this.applyMove(move, board, 'ai');
      const score = this.evaluateBoard(newBoard);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  },

  // 「むずかしい」 (将棋の calculateHardMove を継承)
  calculateHardMove(board) {
    let bestScore = -Infinity;
    let bestMove = null;
    const aiMoves = this.generateAllMoves('ai', board);

    // 角や端を優先して探索順をソート
    aiMoves.sort((a, b) => this.cellValues[b.r][b.c] - this.cellValues[a.r][a.c]);

    for (const move of aiMoves) {
      const newBoard = this.applyMove(move, board, 'ai');
      // リバーシは探索空間が広いため深さ4
      const score = this.alphabeta(newBoard, 4, -Infinity, Infinity, false);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  },

  // 再帰的な探索関数 (将棋の alphabeta と共通)
  alphabeta(board, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return this.evaluateBoard(board);

    if (isMaximizing) {
      let maxEval = -Infinity;
      const moves = this.generateAllMoves('ai', board);
      if (moves.length === 0) return this.evaluateBoard(board);
      for (const move of moves) {
        const nextBoard = this.applyMove(move, board, 'ai');
        const evalScore = this.alphabeta(nextBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const moves = this.generateAllMoves('player', board);
      if (moves.length === 0) return this.evaluateBoard(board);
      for (const move of moves) {
        const nextBoard = this.applyMove(move, board, 'player');
        const evalScore = this.alphabeta(nextBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}