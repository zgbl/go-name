import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface Player {
  id: string;
  username: string;
  status: 'online' | 'playing';
  socket: Socket;
}

interface GameRoom {
  id: string;
  creator: string;
  settings: {
    mainTime: number;
    byoyomiTime: number;
    byoyomiPeriods: number;
  };
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
      lastMoveTime?: number;
    };
    white: {
      mainTime: number;
      byoyomiTime: number;
      byoyomiPeriods: number;
      lastMoveTime?: number;
    };
  };
}

interface GameSettings {
  mainTime: number;
  byoyomiTime: number;
  byoyomiPeriods: number;
}

@WebSocketGateway(3005, {
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private players: Map<string, Player> = new Map();
  private games: Map<string, GameRoom> = new Map();
  private playerGameMap: Map<string, string> = new Map(); // 玩家ID到游戏ID的映射
  private pendingInvitations: Map<string, any> = new Map(); // 存储待处理的邀请及其设置

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // 找到断开连接的玩家
    const playerId = Array.from(this.players.entries())
      .find(([_, player]) => player.socket.id === client.id)?.[0];

    if (playerId) {
      // 从游戏中移除玩家
      const gameId = this.playerGameMap.get(playerId);
      if (gameId) {
        const game = this.games.get(gameId);
        if (game) {
          if (game.players.black?.id === playerId) {
            game.players.black = undefined;
          }
          if (game.players.white?.id === playerId) {
            game.players.white = undefined;
          }
          // 如果游戏中没有玩家了，删除游戏
          if (!game.players.black && !game.players.white) {
            this.games.delete(gameId);
          }
          this.playerGameMap.delete(playerId);
          this.broadcastGameRooms();
        }
      }

      // 从玩家列表中移除
      this.players.delete(playerId);
      this.broadcastOnlinePlayers();
    }

    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('login')
  handleLogin(client: Socket, payload: { username: string }) {
    console.log('Login:', { clientId: client.id, payload });

    // 检查用户名是否已被使用
    const existingPlayer = Array.from(this.players.values())
      .find(p => p.username === payload.username);

    if (existingPlayer) {
      console.error('Username already taken:', payload.username);
      return { error: 'Username already taken' };
    }

    // 创建新玩家
    const player: Player = {
      id: uuidv4(),
      username: payload.username,
      status: 'online',
      socket: client,
    };

    this.players.set(player.id, player);

    // 立即发送在线玩家列表给新登录的玩家
    client.emit('onlinePlayers', Array.from(this.players.values()).map(player => ({
      id: player.id,
      username: player.username,
      status: player.status,
    })));

    // 广播在线玩家列表
    this.broadcastOnlinePlayers();

    return { id: player.id };
  }

  @SubscribeMessage('createGame')
  handleCreateGame(
    client: Socket,
    payload: {
      invitedPlayer: string;
      settings: GameSettings;
    }
  ) {
    console.log('Create game request:', { clientId: client.id, payload });

    try {
      const player = Array.from(this.players.values())
        .find(p => p.socket.id === client.id);

      if (!player) {
        console.error('Player not found for socket:', client.id);
        return { error: 'Player not found' };
      }

      const invitedPlayer = Array.from(this.players.values())
        .find(p => p.username === payload.invitedPlayer);

      if (!invitedPlayer) {
        console.error('Invited player not found:', payload.invitedPlayer);
        return { error: 'Invited player not found' };
      }

      const gameId = uuidv4();
      const game: GameRoom = {
        id: gameId,
        creator: player.username,
        settings: payload.settings,
        status: 'waiting',
        players: {
          black: { id: player.id, username: player.username, socket: player.socket },
          white: null
        },
        board: Array(19).fill(null).map(() => Array(19).fill(0)),
        currentPlayer: 'black',
        remainingTime: {
          black: {
            mainTime: payload.settings.mainTime * 60,
            byoyomiTime: payload.settings.byoyomiTime,
            byoyomiPeriods: payload.settings.byoyomiPeriods,
            lastMoveTime: Date.now()
          },
          white: {
            mainTime: payload.settings.mainTime * 60,
            byoyomiTime: payload.settings.byoyomiTime,
            byoyomiPeriods: payload.settings.byoyomiPeriods,
            lastMoveTime: Date.now()
          }
        }
      };

      this.games.set(gameId, game);

      // 更新游戏房间列表
      this.server.emit('gameRooms', Array.from(this.games.values()).map(game => ({
        id: game.id,
        creator: game.creator,
        settings: game.settings,
        status: game.status,
        players: {
          black: game.players.black ? { username: game.players.black.username } : null,
          white: game.players.white ? { username: game.players.white.username } : null
        },
        remainingTime: game.remainingTime
      })));

      // 发送邀请给目标玩家
      invitedPlayer.socket.emit('gameInvitation', {
        gameId,
        invitingPlayer: player.username,
        settings: payload.settings
      });

      return { success: true, gameId };
    } catch (error) {
      console.error('Error in handleCreateGame:', error);
      return { error: 'Internal server error' };
    }
  }

  @SubscribeMessage('acceptInvitation')
  handleAcceptInvitation(client: Socket, payload: { gameId: string }) {
    console.log('Accept invitation:', { clientId: client.id, payload });

    try {
      const game = this.games.get(payload.gameId);
      if (!game) {
        console.error('Game not found:', payload.gameId);
        return { error: 'Game not found' };
      }

      const player = Array.from(this.players.values())
        .find(p => p.socket.id === client.id);

      if (!player) {
        console.error('Player not found for socket:', client.id);
        return { error: 'Player not found' };
      }

      // 设置白方玩家
      game.players.white = {
        id: player.id,
        username: player.username,
        socket: player.socket
      };
      game.status = 'playing';

      // 通知双方游戏开始
      game.players.black?.socket.emit('gameStart', {
        gameId: game.id,
        color: 'black',
        opponent: player.username,
        board: game.board,
        currentPlayer: game.currentPlayer,
        remainingTime: game.remainingTime
      });

      game.players.white?.socket.emit('gameStart', {
        gameId: game.id,
        color: 'white',
        opponent: game.players.black?.username || '',
        board: game.board,
        currentPlayer: game.currentPlayer,
        remainingTime: game.remainingTime
      });

      // 更新游戏房间列表
      this.server.emit('gameRooms', Array.from(this.games.values()).map(game => ({
        id: game.id,
        creator: game.creator,
        settings: game.settings,
        status: game.status,
        players: {
          black: game.players.black ? { username: game.players.black.username } : null,
          white: game.players.white ? { username: game.players.white.username } : null
        },
        remainingTime: game.remainingTime
      })));

      return { success: true };
    } catch (error) {
      console.error('Error in handleAcceptInvitation:', error);
      return { error: 'Internal server error' };
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket, payload: { gameId: string }) {
    console.log('Join game request:', { clientId: client.id, payload });

    const player = Array.from(this.players.values())
      .find(p => p.socket.id === client.id);

    if (!player) {
      console.error('Player not found');
      return { error: 'Player not found' };
    }

    const game = this.games.get(payload.gameId);
    if (!game) {
      console.error('Game not found:', payload.gameId);
      return { error: 'Game not found' };
    }

    if (game.status !== 'waiting') {
      console.error('Game is not in waiting status:', game.status);
      return { error: 'Game is not available' };
    }

    // 如果是创建者，不能加入自己的游戏
    if (game.creator === player.username) {
      console.error('Cannot join your own game');
      return { error: 'Cannot join your own game' };
    }

    // 设置白方玩家
    game.players.white = player;
    game.status = 'playing';

    // 更新玩家状态
    player.status = 'playing';
    this.playerGameMap.set(player.id, game.id);

    // 通知双方游戏开始
    if (game.players.black) {
      game.players.black.socket.emit('gameStart', {
        gameId: game.id,
        color: 'black',
        opponent: player.username,
        board: game.board,
        currentPlayer: game.currentPlayer,
        remainingTime: game.remainingTime
      });

      player.socket.emit('gameStart', {
        gameId: game.id,
        color: 'white',
        opponent: game.players.black.username,
        board: game.board,
        currentPlayer: game.currentPlayer,
        remainingTime: game.remainingTime
      });

      console.log('Game started:', {
        gameId: game.id,
        black: game.players.black.username,
        white: player.username
      });
    } else {
      console.error('Black player not found in game:', game.id);
      return { error: 'Game initialization error' };
    }

    // 广播更新
    this.broadcastGameRooms();
    this.broadcastOnlinePlayers();

    return { success: true };
  }

  @SubscribeMessage('invitePlayer')
  handleInvitePlayer(client: Socket, payload: { target: string; settings: GameSettings }) {
    console.log('Invite request:', { clientId: client.id, payload });
    
    const inviter = Array.from(this.players.values())
      .find(p => p.socket.id === client.id);
      
    if (!inviter) {
      console.error('Inviter not found');
      return { error: 'Inviter not found' };
    }

    const target = Array.from(this.players.values())
      .find(p => p.username === payload.target);
      
    if (!target) {
      console.error('Target player not found:', payload.target);
      return { error: 'Target player not found' };
    }

    target.socket.emit('gameInvitation', {
      from: inviter.username,
      settings: payload.settings
    });

    return { success: true };
  }

  @SubscribeMessage('counterInvite')
  handleCounterInvite(client: Socket, payload: { inviter: string; settings: GameSettings }) {
    console.log('Counter invite:', { clientId: client.id, payload });
    
    const responder = Array.from(this.players.values())
      .find(p => p.socket.id === client.id);
      
    if (!responder) {
      console.error('Responder not found');
      return { error: 'Responder not found' };
    }

    const inviter = Array.from(this.players.values())
      .find(p => p.username === payload.inviter);
      
    if (!inviter) {
      console.error('Original inviter not found:', payload.inviter);
      return { error: 'Original inviter not found' };
    }

    inviter.socket.emit('gameInvitation', {
      from: responder.username,
      settings: payload.settings
    });

    return { success: true };
  }

  @SubscribeMessage('acceptInvite')
  handleAcceptInvite(client: Socket, payload: { inviter: string }) {
    console.log('Accept invite:', { clientId: client.id, payload });
    
    const accepter = Array.from(this.players.values())
      .find(p => p.socket.id === client.id);
      
    if (!accepter) {
      console.error('Accepter not found');
      return { error: 'Accepter not found' };
    }

    const inviter = Array.from(this.players.values())
      .find(p => p.username === payload.inviter);
      
    if (!inviter) {
      console.error('Inviter not found:', payload.inviter);
      return { error: 'Inviter not found' };
    }

    // 创建新游戏
    const gameId = uuidv4();
    const game: GameRoom = {
      id: gameId,
      creator: inviter.username,
      settings: {
        mainTime: 30,
        byoyomiTime: 30,
        byoyomiPeriods: 5
      },
      status: 'playing',
      players: {
        black: inviter,
        white: accepter
      },
      board: Array(19).fill(null).map(() => Array(19).fill(0)),
      currentPlayer: 'black',
      remainingTime: {
        black: {
          mainTime: 30 * 60,
          byoyomiTime: 30,
          byoyomiPeriods: 5,
          lastMoveTime: Date.now()
        },
        white: {
          mainTime: 30 * 60,
          byoyomiTime: 30,
          byoyomiPeriods: 5,
          lastMoveTime: Date.now()
        }
      }
    };

    this.games.set(gameId, game);
    this.playerGameMap.set(inviter.id, gameId);
    this.playerGameMap.set(accepter.id, gameId);
    inviter.status = 'playing';
    accepter.status = 'playing';

    console.log('Game created:', {
      gameId,
      creator: inviter.username,
      settings: game.settings
    });

    // 通知双方游戏开始
    inviter.socket.emit('gameStart', {
      gameId: game.id,
      color: 'black',
      opponent: accepter.username,
      board: game.board,
      currentPlayer: game.currentPlayer,
      remainingTime: game.remainingTime
    });

    accepter.socket.emit('gameStart', {
      gameId: game.id,
      color: 'white',
      opponent: inviter.username,
      board: game.board,
      currentPlayer: game.currentPlayer,
      remainingTime: game.remainingTime
    });

    this.broadcastGameRooms();
    return { success: true };
  }

  @SubscribeMessage('getRooms')
  handleGetRooms() {
    return Array.from(this.games.values()).map(game => ({
      id: game.id,
      creator: game.creator,
      settings: game.settings,
      status: game.status,
      remainingTime: game.remainingTime
    }));
  }

  @SubscribeMessage('getOnlinePlayers')
  handleGetOnlinePlayers() {
    return Array.from(this.players.values())
      .map(p => p.username);
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(client: Socket, payload: { 
    gameId: string; 
    x: number; 
    y: number; 
    color: 'black' | 'white' 
  }) {
    console.log('Make move:', { clientId: client.id, payload });

    const game = this.games.get(payload.gameId);
    if (!game) {
      console.error('Game not found:', payload.gameId);
      return { error: 'Game not found' };
    }

    if (game.currentPlayer !== payload.color) {
      console.error('Not your turn:', { current: game.currentPlayer, attempted: payload.color });
      return { error: 'Not your turn' };
    }

    // 检查位置是否已经有棋子
    if (game.board[payload.y][payload.x] !== 0) {
      console.error('Position already occupied:', { x: payload.x, y: payload.y });
      return { error: 'Position already occupied' };
    }

    // 更新棋盘
    game.board[payload.y][payload.x] = payload.color === 'black' ? 1 : 2;

    // 检查提子
    const capturedStones = this.checkCapture(game.board, payload.x, payload.y);
    capturedStones.forEach(stone => {
      game.board[stone.y][stone.x] = 0;
    });

    // 更新时间
    this.updateTime(game, payload.color);

    // 切换玩家
    game.currentPlayer = payload.color === 'black' ? 'white' : 'black';

    // 广播移动
    game.players.black?.socket.emit('moveMade', {
      x: payload.x,
      y: payload.y,
      color: payload.color,
      nextPlayer: game.currentPlayer,
      capturedStones,
      remainingTime: game.remainingTime
    });

    game.players.white?.socket.emit('moveMade', {
      x: payload.x,
      y: payload.y,
      color: payload.color,
      nextPlayer: game.currentPlayer,
      capturedStones,
      remainingTime: game.remainingTime
    });

    return { success: true };
  }

  private checkCapture(board: number[][], x: number, y: number): { x: number; y: number }[] {
    const capturedStones: { x: number; y: number }[] = [];
    const currentColor = board[y][x];
    const oppositeColor = currentColor === 1 ? 2 : 1;
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    // 检查四个方向的相邻棋子
    directions.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19 && board[ny][nx] === oppositeColor) {
        const group = this.findGroup(board, nx, ny);
        if (!this.hasLiberty(board, group)) {
          capturedStones.push(...group);
        }
      }
    });

    return capturedStones;
  }

  private findGroup(board: number[][], x: number, y: number): { x: number; y: number }[] {
    const color = board[y][x];
    const group: { x: number; y: number }[] = [];
    const visited = new Set<string>();

    const dfs = (cx: number, cy: number) => {
      const key = `${cx},${cy}`;
      if (visited.has(key)) return;
      visited.add(key);

      if (cx < 0 || cx >= 19 || cy < 0 || cy >= 19 || board[cy][cx] !== color) return;

      group.push({ x: cx, y: cy });

      dfs(cx + 1, cy);
      dfs(cx - 1, cy);
      dfs(cx, cy + 1);
      dfs(cx, cy - 1);
    };

    dfs(x, y);
    return group;
  }

  private hasLiberty(board: number[][], group: { x: number; y: number }[]): boolean {
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const visited = new Set<string>();

    for (const stone of group) {
      for (const [dx, dy] of directions) {
        const nx = stone.x + dx;
        const ny = stone.y + dy;
        const key = `${nx},${ny}`;

        if (visited.has(key)) continue;
        visited.add(key);

        if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19 && board[ny][nx] === 0) {
          return true;
        }
      }
    }

    return false;
  }

  private updateTime(game: GameRoom, color: 'black' | 'white') {
    if (!game.remainingTime) {
      game.remainingTime = {
        black: {
          mainTime: game.settings.mainTime * 60,
          byoyomiTime: game.settings.byoyomiTime,
          byoyomiPeriods: game.settings.byoyomiPeriods,
          lastMoveTime: Date.now()
        },
        white: {
          mainTime: game.settings.mainTime * 60,
          byoyomiTime: game.settings.byoyomiTime,
          byoyomiPeriods: game.settings.byoyomiPeriods,
          lastMoveTime: Date.now()
        }
      };
      return;
    }

    const time = game.remainingTime[color];
    const now = Date.now();
    const elapsedSeconds = time.lastMoveTime ? Math.floor((now - time.lastMoveTime) / 1000) : 0;
    
    if (time.mainTime > 0) {
      time.mainTime = Math.max(0, time.mainTime - elapsedSeconds);
      if (time.mainTime === 0) {
        time.byoyomiTime = game.settings.byoyomiTime;
      }
    } else {
      time.byoyomiTime = Math.max(0, time.byoyomiTime - elapsedSeconds);
      if (time.byoyomiTime === 0 && time.byoyomiPeriods > 0) {
        time.byoyomiPeriods -= 1;
        time.byoyomiTime = game.settings.byoyomiTime;
      }
    }
    
    // 更新最后移动时间
    time.lastMoveTime = now;
    
    // 更新对手的最后移动时间
    const otherColor = color === 'black' ? 'white' : 'black';
    game.remainingTime[otherColor].lastMoveTime = now;
  }

  private broadcastGameRooms() {
    this.server.emit('gameRooms', Array.from(this.games.values()).map(game => ({
      id: game.id,
      creator: game.creator,
      settings: game.settings,
      status: game.status,
      players: {
        black: game.players.black ? {
          id: game.players.black.id,
          username: game.players.black.username
        } : null,
        white: game.players.white ? {
          id: game.players.white.id,
          username: game.players.white.username
        } : null
      },
      board: game.board,
      currentPlayer: game.currentPlayer,
      remainingTime: game.remainingTime
    })));
  }

  private broadcastOnlinePlayers() {
    this.server.emit('onlinePlayers', Array.from(this.players.values()).map(player => ({
      id: player.id,
      username: player.username,
      status: player.status,
    })));
  }

  // ... 其他现有的游戏逻辑方法 ...
}
