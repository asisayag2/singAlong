# Sing Along

A real-time lyrics display application with synchronized word highlighting. Built with React, Node.js, and Socket.IO.

## Features

- Real-time lyrics display with word-by-word highlighting
- CSV upload for song lyrics mapping
- WebSocket-based synchronization
- Modern Material-UI interface

## Project Structure

- `/client` - React frontend application
- `/server` - Node.js backend server

## Prerequisites

- Node.js (v16 or higher)
- npm

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd sing-along
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

## Running the Application

1. Start the server (from the server directory):
```bash
npm run dev
```

2. Start the client (from the client directory):
```bash
npm start
```

The server will run on http://localhost:3001 and the client on http://localhost:3000.

## API Endpoints

- `POST /song` - Upload song lyrics mapping (CSV file)
- `GET /song/:songNumber` - Retrieve song lyrics
- `POST /trigger` - Trigger word highlighting

## CSV Format

The CSV file should have the following columns:
- `note` - Line number
- `velocity` - Word number within the line
- `word` - The actual word

Example:
```csv
note,velocity,word
1,1,Hello
1,2,world
```

## WebSocket Events

- `wordChange` - Emitted when a word highlight is triggered
  - Parameters: `{ songNumber, lineNumber, wordNumber }` 