import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  Box,
  Button,
  Grid,
  GridItem,
  Text,
  VStack,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Stack,
  TableContainer,
} from '@chakra-ui/react';
import Board from '../components/Board';
import InviteModal from '../components/InviteModal';

interface GameSettings {
  mainTime: number;
  byoyomiTime: number;
  byoyomiPeriods: number;
}

interface Player {
  id: string;
  username: string;
  status: string;
}

interface GameRoom {
  id: string;
  creator: string;
  settings: GameSettings;
  status: 'waiting' | 'playing' | 'finished';
  players: {
    black?: Player;
    white?: Player;
  };
  board: number[][];
  currentPlayer: 'black' | 'white';
  remainingTime?: {
    black: {
      mainTime: number;
      byoyomiTime: number;
      byoyomiPeriods: number;
    };
    white: {
      mainTime: number;
      byoyomiTime: number;
      byoyomiPeriods: number;
    };
  };
}

interface CurrentGame {
  id: string;
  creator: string;
  settings: GameSettings;
  status: 'playing';
  players: {
    black: Player;
    white: Player;
  };
  board: number[][];
  currentPlayer: 'black' | 'white';
  remainingTime: {
    black: {
      mainTime: number;
      byoyomiTime: number;
      byoyomiPeriods: number;
    };
    white: {
      mainTime: number;
      byoyomiTime: number;
      byoyomiPeriods: number;
    };
  };
}

interface GameLobbyProps {
  username: string;
  socket: Socket;
  onLogout: () => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ username, socket, onLogout }) => {
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([]);
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitingPlayer, setInvitingPlayer] = useState<string>('');
  const [isCounterInvite, setIsCounterInvite] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    mainTime: 30,
    byoyomiTime: 30,
    byoyomiPeriods: 5
  });
  const [myColor, setMyColor] = useState<'black' | 'white' | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleJoinGame = (gameId: string) => {
    console.log('Joining game:', gameId);
    const game = gameRooms.find(room => room.id === gameId);
    if (!game) {
      console.error('Game not found:', gameId);
      return;
    }

    if (game.status !== 'waiting') {
      console.error('Game is not available:', game.status);
      return;
    }

    if (game.creator === username) {
      console.error('Cannot join your own game');
      return;
    }

    socket?.emit('joinGame', { gameId });
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('register', { username });
    });

    socket.on('gameRooms', (rooms: GameRoom[]) => {
      console.log('Received game rooms:', rooms);
      setGameRooms(rooms);
    });

    socket.on('onlinePlayers', (players: Player[]) => {
      console.log('Received online players:', players);
      // 过滤掉自己
      setOnlinePlayers(players.filter(p => p.username !== username));
    });

    socket.on('gameInvitation', (data: { from: string, settings: GameSettings }) => {
      console.log('Received game invitation:', data);
      const accept = window.confirm(
        `${data.from} 邀请你加入游戏\n` +
        `时间设置：\n` +
        `- 基本时限：${data.settings.mainTime}分钟\n` +
        `- 读秒时间：${data.settings.byoyomiTime}秒\n` +
        `- 读秒次数：${data.settings.byoyomiPeriods}次\n\n` +
        `是否接受？（不接受可以修改设置后反邀请）`
      );
      
      if (accept) {
        socket.emit('acceptInvite', {
          inviter: data.from
        });
      } else {
        setSettings(data.settings);
        setInvitingPlayer(data.from);
        setIsCounterInvite(true);
        onOpen();
      }
    });

    socket.on('gameStart', (data: { 
      gameId: string;
      color: 'black' | 'white';
      opponent: string;
      board: number[][];
      currentPlayer: 'black' | 'white';
      remainingTime: {
        black: {
          mainTime: number;
          byoyomiTime: number;
          byoyomiPeriods: number;
        };
        white: {
          mainTime: number;
          byoyomiTime: number;
          byoyomiPeriods: number;
        };
      };
    }) => {
      console.log('Game started:', data);
      
      setMyColor(data.color);
      setCurrentGame({
        id: data.gameId,
        creator: username,
        settings: settings,
        status: 'playing',
        players: {
          black: data.color === 'black' ? { username } : { username: data.opponent },
          white: data.color === 'white' ? { username } : { username: data.opponent }
        },
        board: data.board || Array(19).fill(null).map(() => Array(19).fill(0)),
        currentPlayer: data.currentPlayer,
        remainingTime: data.remainingTime,
      });

      // 更新游戏房间列表
      setGameRooms(prev => prev.map(room => 
        room.id === data.gameId 
          ? {
              ...room,
              status: 'playing',
              players: {
                black: data.color === 'black' ? { username } : { username: data.opponent },
                white: data.color === 'white' ? { username } : { username: data.opponent }
              },
              remainingTime: data.remainingTime,
            }
          : room
      ));
    });

    socket.on('moveMade', (data: { 
      x: number; 
      y: number; 
      color: 'black' | 'white'; 
      nextPlayer: 'black' | 'white';
      capturedStones?: { x: number; y: number }[];
      remainingTime?: {
        black: {
          mainTime: number;
          byoyomiTime: number;
          byoyomiPeriods: number;
        };
        white: {
          mainTime: number;
          byoyomiTime: number;
          byoyomiPeriods: number;
        };
      };
    }) => {
      console.log('Move made:', data);
      
      setCurrentGame(prev => {
        if (!prev) {
          console.error('No current game');
          return prev;
        }
        
        const newBoard = prev.board.map(row => [...row]);
        newBoard[data.y][data.x] = data.color === 'black' ? 1 : 2;
        
        // 处理提子
        if (data.capturedStones) {
          data.capturedStones.forEach(stone => {
            newBoard[stone.y][stone.x] = 0;
          });
        }
        
        return {
          ...prev,
          board: newBoard,
          currentPlayer: data.nextPlayer,
          remainingTime: data.remainingTime,
        };
      });
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      alert('发生错误：' + error.message);
    });

    socket.on('connect_error', (error: any) => {
      console.error('Connection error:', error);
      alert('连接错误：' + error.message);
    });

    return () => {
      socket.off('gameRooms');
      socket.off('onlinePlayers');
      socket.off('gameInvitation');
      socket.off('gameStart');
      socket.off('moveMade');
      socket.off('error');
      socket.off('connect_error');
    };
  }, [socket, username, gameRooms]);

  const formatTime = (time: { mainTime: number; byoyomiTime: number; byoyomiPeriods: number }) => {
    if (time.mainTime > 0) {
      return `${Math.floor(time.mainTime / 60)}:${(time.mainTime % 60).toString().padStart(2, '0')}`;
    } else {
      return `${time.byoyomiTime}秒 x ${time.byoyomiPeriods}`;
    }
  };

  const handleInvitePlayer = (targetPlayer: string) => {
    setInvitingPlayer(targetPlayer);
    setIsCounterInvite(false);
    onOpen();
  };

  const handleCreateGame = () => {
    if (!socket) return;
    socket.emit('createGame', { 
      creator: username, 
      settings 
    });
  };

  const handleSendInvite = () => {
    if (!socket || !invitingPlayer) return;
    
    if (isCounterInvite) {
      socket.emit('counterInvite', {
        inviter: invitingPlayer,
        settings
      });
    } else {
      socket.emit('invitePlayer', {
        target: invitingPlayer,
        settings
      });
    }
    
    onClose();
    setInvitingPlayer(null);
    setIsCounterInvite(false);
  };

  const handleBoardClick = (x: number, y: number) => {
    if (!currentGame || !socket || !myColor) {
      console.log('Cannot make move:', { 
        hasGame: !!currentGame, 
        hasSocket: !!socket, 
        myColor 
      });
      return;
    }
    
    console.log('Current game state:', {
      currentPlayer: currentGame.currentPlayer,
      myColor,
      board: currentGame.board
    });
    
    // 检查是否轮到自己落子
    if (currentGame.currentPlayer !== myColor) {
      console.log('Not your turn');
      return;
    }

    console.log('Attempting move:', { x, y, color: myColor });
    socket.emit('makeMove', {
      gameId: currentGame.id,
      x,
      y,
      color: myColor
    });
  };

  return (
    <Grid templateColumns="1fr 300px" gap={8} p={8}>
      <GridItem>
        {currentGame ? (
          <Box>
            <Board
              board={currentGame.board}
              onIntersectionClick={handleBoardClick}
            />
            <Text mt={4}>
              当前玩家: {currentGame.currentPlayer === 'black' ? '黑方' : '白方'}
              {currentGame.currentPlayer === myColor && ' (轮到你了)'}
            </Text>
            {currentGame.remainingTime && (
              <Stack mt={2} spacing={2}>
                <Text>
                  黑方时间: {formatTime(currentGame.remainingTime.black)}
                </Text>
                <Text>
                  白方时间: {formatTime(currentGame.remainingTime.white)}
                </Text>
              </Stack>
            )}
          </Box>
        ) : (
          <Box>
            <Text fontSize="xl" mb={4}>游戏列表</Text>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>创建者</Th>
                    <Th>状态</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {gameRooms.map((room) => (
                    <Tr key={room.id}>
                      <Td>{room.creator}</Td>
                      <Td>{room.status}</Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleJoinGame(room.id)}
                          isDisabled={
                            room.status !== 'waiting' ||
                            room.players.black?.username === username
                          }
                        >
                          加入
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </GridItem>

      <GridItem>
        <Box>
          <Text fontSize="xl" mb={4}>在线玩家</Text>
          <VStack align="stretch" spacing={4}>
            {onlinePlayers.map(player => (
              <Box
                key={player.id}
                p={4}
                borderWidth={1}
                borderRadius="md"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Text>{player.username}</Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => handleInvitePlayer(player.username)}
                  isDisabled={player.status === 'playing'}
                >
                  邀请
                </Button>
              </Box>
            ))}
          </VStack>
        </Box>
      </GridItem>

      {invitingPlayer && (
        <InviteModal
          isOpen={isOpen}
          onClose={() => {
            onClose();
            setInvitingPlayer(null);
            setIsCounterInvite(false);
          }}
          settings={settings}
          onSettingsChange={setSettings}
          onSendInvite={handleSendInvite}
          isCounterInvite={isCounterInvite}
        />
      )}
    </Grid>
  );
};

export default GameLobby;
