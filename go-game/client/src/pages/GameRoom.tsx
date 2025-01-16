import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import GoBoard from '../components/GoBoard';
import GameTimer from '../components/GameTimer';
import { io, Socket } from 'socket.io-client';

interface GameState {
  board: number[][];
  currentPlayer: 'black' | 'white';
  lastMove?: { x: number; y: number };
  settings: {
    mainTime: number;
    byoyomiTime: number;
    byoyomiPeriods: number;
  };
}

interface Player {
  id: string;
  name: string;
  color: 'black' | 'white';
}

interface GameRoomProps {
  playerName: string;
  gameId: string;
  socket: Socket;
  onLeaveGame: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({
  playerName,
  gameId,
  socket,
  onLeaveGame,
}) => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(19).fill(null).map(() => Array(19).fill(0)),
    currentPlayer: 'black',
    settings: {
      mainTime: 30,
      byoyomiTime: 30,
      byoyomiPeriods: 5,
    }
  });
  const [player, setPlayer] = useState<Player | null>(null);
  const [opponent, setOpponent] = useState<Player | null>(null);
  const toast = useToast();

  useEffect(() => {
    socket.on('gameState', (newState: GameState) => {
      console.log('Received game state:', newState);
      setGameState(newState);
    });

    socket.on('playerInfo', (playerInfo: { player: Player; opponent: Player }) => {
      console.log('Received player info:', playerInfo);
      setPlayer(playerInfo.player);
      setOpponent(playerInfo.opponent);
    });

    socket.on('gameEnd', (data: { winner: 'black' | 'white'; reason: string }) => {
      const winnerName = data.winner === player?.color ? playerName : opponent?.name;
      toast({
        title: `游戏结束`,
        description: `${winnerName} 获胜！原因：${data.reason}`,
        status: 'info',
        duration: null,
        isClosable: true,
      });
      onLeaveGame();
    });

    return () => {
      socket.off('gameState');
      socket.off('playerInfo');
      socket.off('gameEnd');
    };
  }, [socket, playerName, opponent?.name, player?.color, onLeaveGame, toast]);

  const handleMove = (position: { x: number; y: number }) => {
    if (!player) return;
    
    if ((player.color === 'black' && gameState.currentPlayer !== 'black') ||
        (player.color === 'white' && gameState.currentPlayer !== 'white')) {
      toast({
        title: "不是你的回合",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    console.log('Making move:', position);
    socket.emit('makeMove', {
      gameId,
      position,
      color: player.color
    });
  };

  const handleResign = () => {
    if (!player) return;
    socket.emit('resign', {
      gameId,
      color: player.color
    });
  };

  const handleTimeout = () => {
    if (!player) return;
    socket.emit('timeout', {
      gameId,
      color: player.color
    });
  };

  return (
    <Grid
      templateColumns="1fr auto"
      gap={8}
      p={8}
      maxW="1400px"
      mx="auto"
    >
      <GridItem>
        <Box bg="white" p={4} borderRadius="lg" boxShadow="md">
          <GoBoard 
            size={19} 
            cellSize={30}
            board={gameState.board}
            onMove={handleMove}
          />
        </Box>
      </GridItem>
      
      <GridItem>
        <VStack spacing={4} align="stretch" width="300px">
          <Box p={4} borderWidth={1} borderRadius="md" bg="white">
            <Text fontSize="lg" fontWeight="bold" mb={4}>游戏信息</Text>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text mb={2}>黑方：{opponent?.color === 'black' ? opponent.name : player?.name || '等待中...'}</Text>
                {gameState.currentPlayer === 'black' && (
                  <GameTimer
                    isActive={true}
                    mainTime={gameState.settings.mainTime}
                    byoyomiTime={gameState.settings.byoyomiTime}
                    byoyomiPeriods={gameState.settings.byoyomiPeriods}
                    onTimeout={handleTimeout}
                  />
                )}
              </Box>
              <Box>
                <Text mb={2}>白方：{opponent?.color === 'white' ? opponent.name : player?.name || '等待中...'}</Text>
                {gameState.currentPlayer === 'white' && (
                  <GameTimer
                    isActive={true}
                    mainTime={gameState.settings.mainTime}
                    byoyomiTime={gameState.settings.byoyomiTime}
                    byoyomiPeriods={gameState.settings.byoyomiPeriods}
                    onTimeout={handleTimeout}
                  />
                )}
              </Box>
              {player && (
                <Text color="blue.500">
                  你是：{player.color === 'black' ? '黑方' : '白方'}
                </Text>
              )}
            </VStack>
          </Box>

          <Box p={4} borderWidth={1} borderRadius="md" bg="white">
            <Text fontSize="lg" fontWeight="bold" mb={2}>操作</Text>
            <VStack spacing={2}>
              <Button 
                colorScheme="blue" 
                width="100%" 
                onClick={handleResign}
              >
                投降
              </Button>
              <Button width="100%" onClick={() => {}}>请求悔棋</Button>
              <Button width="100%" onClick={() => {}}>保存棋谱</Button>
              <Button 
                colorScheme="red" 
                variant="outline"
                width="100%" 
                onClick={onLeaveGame}
              >
                离开对局
              </Button>
            </VStack>
          </Box>
        </VStack>
      </GridItem>
    </Grid>
  );
};

export default GameRoom;
