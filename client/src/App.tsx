import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Container, Typography, Paper, Box } from '@mui/material';
import './App.css';

interface WordChange {
  songNumber: string;
  lineNumber: string;
  wordNumber: string;
}

interface LyricWord {
  lineNumber: string;
  wordNumber: string;
  word: string;
}

const SERVER_URL = 'http://54.218.89.203:3001';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentSong, setCurrentSong] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricWord[]>([]);
  const [activeWord, setActiveWord] = useState<{ line: string; word: string } | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('wordChange', async (data: WordChange) => {
      if (currentSong !== data.songNumber) {
        // Fetch new song lyrics
        try {
          const response = await fetch(`${SERVER_URL}/song/${data.songNumber}`);
          const songData = await response.json();
          setLyrics(songData);
          setCurrentSong(data.songNumber);
        } catch (error) {
          console.error('Error fetching song:', error);
        }
      }
      
      setActiveWord({ line: data.lineNumber, word: data.wordNumber });
    });

    return () => {
      newSocket.close();
    };
  }, [currentSong]);

  const renderLyrics = () => {
    if (!lyrics.length) {
      return (
        <Typography variant="h5" align="center" color="textSecondary">
          Waiting for song...
        </Typography>
      );
    }

    // Group words by line number
    const lineGroups = lyrics.reduce((acc: { [key: string]: LyricWord[] }, word) => {
      if (!acc[word.lineNumber]) {
        acc[word.lineNumber] = [];
      }
      acc[word.lineNumber].push(word);
      return acc;
    }, {});

    return Object.entries(lineGroups).map(([lineNumber, words]) => (
      <Box key={lineNumber} sx={{ my: 1 }}>
        {words.map((word) => (
          <Typography
            key={`${word.lineNumber}-${word.wordNumber}`}
            component="span"
            sx={{
              mx: 0.5,
              display: 'inline-block',
              backgroundColor:
                activeWord?.line === word.lineNumber && activeWord?.word === word.wordNumber
                  ? 'primary.main'
                  : 'transparent',
              color:
                activeWord?.line === word.lineNumber && activeWord?.word === word.wordNumber
                  ? 'white'
                  : 'inherit',
              padding: '2px 4px',
              borderRadius: 1,
              transition: 'all 0.3s ease',
            }}
          >
            {word.word}
          </Typography>
        ))}
      </Box>
    ));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, minHeight: '70vh' }}>
        <Typography variant="h3" align="center" gutterBottom>
          Sing with us!!
        </Typography>
        {currentSong && (
          <Typography variant="h6" align="center" color="primary" gutterBottom>
          </Typography>
        )}
        <Box sx={{ mt: 4 }}>{renderLyrics()}</Box>
      </Paper>
    </Container>
  );
}

export default App;
