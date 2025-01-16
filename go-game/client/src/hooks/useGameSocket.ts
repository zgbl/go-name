import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Position {
  x: number;
  y: number;
}

interface GameState {
  board: number[][];
  currentPlayer: 'black' | 'white';
  lastMove?: Position;
}

interface UseGameSocket {
  joinGame: (gameId: string) => void;
  makeMove: (position: Position) => void;
  resign: () => void;
}

const SOCKET_SERVER_URL = 'http://localhost:3004';

export const useGameSocket = (
  gameId: string,
  onGameUpdate: (state: GameState) => void,
  onGameEnd: (data: { winner: string; reason: string }) => void
): UseGameSocket => {
  let socket: Socket | null = null;

  useEffect(() => {
    socket = io(SOCKET_SERVER_URL);

    socket.on('gameUpdate', (gameState: GameState) => {
      onGameUpdate(gameState);
    });

    socket.on('gameEnd', (data) => {
      onGameEnd(data);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const joinGame = useCallback(() => {
    if (socket) {
      socket.emit('joinGame', gameId);
    }
  }, [gameId]);

  const makeMove = useCallback((position: Position) => {
    if (socket) {
      socket.emit('makeMove', { gameId, position });
    }
  }, [gameId]);

  const resign = useCallback(() => {
    if (socket) {
      socket.emit('resign', gameId);
    }
  }, [gameId]);

  return {
    joinGame,
    makeMove,
    resign,
  };
};
