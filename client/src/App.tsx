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

interface SongData {
  songNumber: string;
  songName: string;
  artist: string;
  words: LyricWord[];
}

const SERVER_URL = 'http://54.218.89.203:3001';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentSong, setCurrentSong] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricWord[]>([]);
  const [songMetadata, setSongMetadata] = useState<{ name: string; artist: string } | null>(null);
  const [activeWord, setActiveWord] = useState<{ line: string; word: string } | null>(null);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    console.log("Socket connected");

    newSocket.on('wordChange', async (data: WordChange) => {
      console.log("Word change event received:", data);
      if (currentSong !== data.songNumber) {
        // Fetch new song lyrics
        try {
          const response = await fetch(`${SERVER_URL}/song/${data.songNumber}`);
          const songData: SongData = await response.json();
          setLyrics(songData.words);
          setSongMetadata({ name: songData.songName, artist: songData.artist });
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

    // Sort lines numerically
    return Object.entries(lineGroups)
      .sort(([lineA], [lineB]) => parseInt(lineA) - parseInt(lineB))
      .map(([lineNumber, words]) => (
        <Box key={lineNumber} sx={{ my: 2, textAlign: 'center' }}>
          {words.map((word) => (
            <Typography
              key={`${word.lineNumber}-${word.wordNumber}`}
              component="span"
              sx={{
                mx: 0.5,
                display: 'inline-block',
                fontSize: '2rem',
                backgroundColor:
                  activeWord?.line === word.lineNumber && activeWord?.word === word.wordNumber
                    ? 'primary.main'
                    : 'transparent',
                color:
                  activeWord?.line === word.lineNumber && activeWord?.word === word.wordNumber
                    ? 'white'
                    : 'inherit',
                padding: '4px 8px',
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
      <Paper elevation={3} sx={{ p: 4, minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h2" align="center" gutterBottom sx={{ mb: 4 }}>
          Sing with us!!
        </Typography>
        {songMetadata && (
          <Box sx={{ mb: 4, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" color="primary">
              {songMetadata.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              by
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {songMetadata.artist}
            </Typography>
          </Box>
        )}
        <Box sx={{ mt: 4, width: '100%' }}>{renderLyrics()}</Box>
      </Paper>
    </Container>
  );
}

export default App;
