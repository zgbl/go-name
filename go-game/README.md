# Go Game Platform

A real-time multiplayer Go (围棋) game platform built with Node.js, React, and Socket.IO.

## Features

- Real-time multiplayer gameplay
- Player matching and invitations
- Time control system (Main time + Byoyomi)
- Live game state updates
- Player status tracking

## Tech Stack

- **Frontend**: React, Chakra UI, Socket.IO Client
- **Backend**: NestJS, Socket.IO
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/zgbl/go-game.git
cd go-game
```

2. Install dependencies for both client and server
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Start the development servers
```bash
# Start server (in server directory)
npm run start:dev

# Start client (in client directory)
npm run dev
```

## License

MIT
