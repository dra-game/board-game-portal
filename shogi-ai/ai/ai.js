// ai.js

export const AI = {

  pieceValues: { '王': 50000, '金': 200, '銀': 150 },
  // 盤面のマスの位置価値
  positionValue(row, col) {
    const center = 2;
    const distance = Math.abs(center - row) + Math.abs(center - col);
    return 5 - distance;
  },

  // 持ち駒の価値を合計
  capturedValue(pieces, owner) {
    return pieces.reduce((sum, type) => {
      const value = this.pieceValues[type] || 0;
      const bonus = 20;
      return sum + (owner === 'ai' ? value + bonus : -(value + bonus));
    }, 0);
  },

  // 現在の盤面と持ち駒から総合評価値を計算
  evaluateBoard(boardState, playerCap, aiCap) {
    let score = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const piece = boardState[row][col];
        if (piece) {
          const value = this.pieceValues[piece.type] || 0;
          const posVal = this.positionValue(row, col);
          const totalValue = value + posVal;
          score += piece.owner === 'ai' ? totalValue : -totalValue;
        }
      }
    }
    score += this.capturedValue(aiCap, 'ai');
    score += this.capturedValue(playerCap, 'player');
    return score;
  },

  isValidAIMove(fromRow, fromCol, toRow, toCol, board) {
    const piece = board[fromRow][fromCol];
    if (!piece || piece.owner !== 'ai') return false;

    const dRow = toRow - fromRow;
    const dCol = toCol - fromCol;
    const target = board[toRow]?.[toCol];
    if (target && target.owner === 'ai') return false;

    const directions = {
      '王': [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
      '金': [[1, -1], [1, 0], [1, 1], [0, -1], [0, 1], [-1, 0]],
      '銀': [[1, -1], [1, 0], [1, 1], [-1, -1], [-1, 1]]
    };

    return directions[piece.type]?.some(([dr, dc]) => dr === dRow && dc === dCol);
  },

  generateAllMoves(owner, board, capturedPieces) {
    const moves = [];
    const directions = {
      '王': [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
      '金': owner === 'ai'
        ? [[1, -1], [1, 0], [1, 1], [0, -1], [0, 1], [-1, 0]]
        : [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]],
      '銀': owner === 'ai'
        ? [[1, -1], [1, 0], [1, 1], [-1, -1], [-1, 1]]
        : [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]]
    };

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const piece = board[row][col];
        if (piece && piece.owner === owner) {
          const pieceDirs = directions[piece.type];
          for (const [dr, dc] of pieceDirs) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
              const target = board[newRow][newCol];
              if (!target || target.owner !== owner) {
                moves.push({ type: 'move', from: [row, col], to: [newRow, newCol] });
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < capturedPieces.length; i++) {
      const type = capturedPieces[i];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          if (board[row][col] === null) {
            moves.push({ type: 'drop', pieceType: type, position: [row, col], index: i });
          }
        }
      }
    }
    return moves;
  },

  applyMove(move, board, playerCaptured, aiCaptured, currentMovingOwner) {
    const newBoard = board.map(row => [...row]);
    const newP = [...playerCaptured];
    const newA = [...aiCaptured];

    if (move.type === 'move') {
      const [fromRow, fromCol] = move.from;
      const [toRow, toCol] = move.to;
      const movingPiece = newBoard[fromRow][fromCol];
      const target = newBoard[toRow][toCol];

      if (target && target.owner !== movingPiece.owner) {
        if (movingPiece.owner === 'ai') newA.push(target.type);
        else newP.push(target.type);
      }
      newBoard[toRow][toCol] = movingPiece;
      newBoard[fromRow][fromCol] = null;
    } else if (move.type === 'drop') {
      const [row, col] = move.position;
      newBoard[row][col] = { type: move.pieceType, owner: currentMovingOwner }; // ownerを動的に
      if (currentMovingOwner === 'ai') newA.splice(move.index, 1);
      else newP.splice(move.index, 1);
    }
    return { newBoard, newP, newA };
  },

  // 最善手を探す
  findBestMove(difficulty, board, playerCaptured, aiCaptured) {
    if (difficulty === 'easy') {
      return this.calculateEasyMove(board, playerCaptured, aiCaptured);
    } else if (difficulty === 'normal') {
      return this.calculateNormalMove(board, playerCaptured, aiCaptured);
    } else {
      return this.calculateHardMove(board, playerCaptured, aiCaptured);
    }
  },

  // 「かんたん」：ランダム要素を加え、わざとミスを誘発する
  calculateEasyMove(board, playerCaptured, aiCaptured) {
    const aiMoves = this.generateAllMoves('ai', board, aiCaptured);
    
    // 1. 全ての手にスコアをつける
    const ratedMoves = aiMoves.map(move => {
      const { newBoard, newP, newA } = this.applyMove(move, board, playerCaptured, aiCaptured, 'ai');
      return { move, score: this.evaluateBoard(newBoard, newP, newA) };
    });

    // 2. スコア順にソート（昇順：弱い順）
    ratedMoves.sort((a, b) => a.score - b.score);

    // 3. 30%の確率で、わざと下位（弱い方）から手を選ぶ
    if (Math.random() < 0.3) {
      // 下位から3つ以内の弱い手を選ぶ
      const index = Math.floor(Math.random() * Math.min(3, ratedMoves.length));
      return ratedMoves[index].move;
    }

    // それ以外は現状の「ふつう」と同じ（一番良い手を選ぶ）
    return this.calculateNormalMove(board, playerCaptured, aiCaptured);
  },

  // 「ふつう」
  calculateNormalMove(board, playerCaptured, aiCaptured) {
    let bestScore = -Infinity;
    let bestMove = null;
    const aiMoves = this.generateAllMoves('ai', board, aiCaptured);

    for (const move of aiMoves) {
      const { newBoard, newP, newA } = this.applyMove(move, board, playerCaptured, aiCaptured, 'ai');
      const score = this.evaluateBoard(newBoard, newP, newA);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  },

  // 「むずかしい」：Minimax法による深さ3の探索
  calculateHardMove(board, playerCaptured, aiCaptured) {
    let bestScore = -Infinity;
    let bestMove = null;
    const aiMoves = this.generateAllMoves('ai', board, aiCaptured);

    // 手の並び替え（駒を取る手を優先して探索効率アップ）
    aiMoves.sort((a, b) => {
      const scoreA = a.type === 'move' && board[a.to[0]][a.to[1]] ? 1 : 0;
      const scoreB = b.type === 'move' && board[b.to[0]][b.to[1]] ? 1 : 0;
      return scoreB - scoreA;
    });

    for (const move of aiMoves) {
      const { newBoard, newP, newA } = this.applyMove(move, board, playerCaptured, aiCaptured, 'ai');
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const searchDepth = isMobile ? 3 : 4;
      // 相手（プレイヤー）が最善を尽くすと仮定して、その後の評価値を計算（深さ3）
      const score = this.alphabeta(newBoard, newP, newA, searchDepth, -Infinity, Infinity, false);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  },

  // 再帰的な探索関数
  alphabeta(board, pCap, aCap, depth, alpha, beta, isMaximizing) {
    // 深さ0、またはどちらかの王がいない場合は評価値を返す
    if (depth === 0) return this.evaluateBoard(board, pCap, aCap);

    if (isMaximizing) {
      let maxEval = -Infinity;
      const moves = this.generateAllMoves('ai', board, aCap);
      if (moves.length === 0) return -100000; // 詰み
      for (const move of moves) {
        const { newBoard, newP, newA } = this.applyMove(move, board, pCap, aCap, 'ai');
        const evalScore = this.alphabeta(newBoard, newP, newA, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break; // 枝刈り
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const moves = this.generateAllMoves('player', board, pCap);
      if (moves.length === 0) return 100000; // 勝利
      for (const move of moves) {
        const { newBoard, newP, newA } = this.applyMove(move, board, pCap, aCap, 'player');
        const evalScore = this.alphabeta(newBoard, newP, newA, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break; // 枝刈り
      }
      return minEval;
    }
  }
}