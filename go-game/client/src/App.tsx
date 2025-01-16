import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import GameRoom from './pages/GameRoom';
import GameLobby from './pages/GameLobby';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [username, setUsername] = useState<string>(() => {
    // 从本地存储获取用户名
    return localStorage.getItem('username') || '';
  });
  const [currentGameId, setCurrentGameId] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 如果有保存的用户名，自动重新连接
    if (username) {
      const newSocket = io('http://localhost:3005');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to server');
        // 自动登录
        newSocket.emit('login', { username: username }, (response: any) => {
          if (response.error) {
            console.error('Auto login failed:', response.error);
            // 如果自动登录失败（例如用户名已被使用），清除本地存储
            localStorage.removeItem('username');
            setUsername('');
          }
        });
      });

      return () => {
        newSocket.close();
      };
    }
  }, [username]);

  const handleLogin = (newUsername: string) => {
    if (!newUsername.trim()) return;

    const newSocket = io('http://localhost:3001');
    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('login', { username: newUsername }, (response: any) => {
        if (response.error) {
          console.error('Login failed:', response.error);
          alert(response.error);
          newSocket.close();
        } else {
          // 登录成功后保存用户名
          localStorage.setItem('username', newUsername);
          setUsername(newUsername);
          setSocket(newSocket);
        }
      });
    });
  };

  const handleLogout = () => {
    if (socket) {
      socket.close();
    }
    localStorage.removeItem('username');
    setUsername('');
    setCurrentGameId('');
    setSocket(null);
  };

  const handleJoinGame = (gameId: string) => {
    setCurrentGameId(gameId);
  };

  const handleLeaveGame = () => {
    setCurrentGameId('');
  };

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50">
        {!username ? (
          <Login onLogin={handleLogin} />
        ) : (
          <>
            <Navbar username={username} onLogout={handleLogout} />
            {currentGameId ? (
              <GameRoom
                playerName={username}
                gameId={currentGameId}
                socket={socket!}
                onLeaveGame={handleLeaveGame}
              />
            ) : (
              <GameLobby
                username={username}
                socket={socket!}
                onJoinGame={handleJoinGame}
              />
            )}
          </>
        )}
      </Box>
    </ChakraProvider>
  );
};

export default App;
