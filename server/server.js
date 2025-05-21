const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const { parse } = require('csv-parse');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Create songs directory if it doesn't exist
const SONGS_DIR = path.join(__dirname, 'songs');
fs.mkdir(SONGS_DIR, { recursive: true }).catch(console.error);

// Configure multer for CSV file upload
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to save song data
async function saveSong(songNumber, mapping, songName = '', artist = '') {
  const songData = {
    songNumber,
    songName,
    artist,
    words: Array.from(mapping.entries()).map(([key, word]) => ({
      key,
      word,
      lineNumber: key.substring(1, 3),
      wordNumber: key.substring(4, 6)
    }))
  };

  const filePath = path.join(SONGS_DIR, `song_${songNumber}.json`);
  await fs.writeFile(filePath, JSON.stringify(songData, null, 2));
  return songData;
}

// Helper function to load song data
async function loadSong(songNumber) {
  try {
    const filePath = path.join(SONGS_DIR, `song_${songNumber}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    const songData = JSON.parse(data);
    return songData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// POST endpoint to receive song mapping
app.post('/song', upload.single('file'), async (req, res) => {
  try {
    console.log("Received song mapping request");
    const { songNumber, songName, artist } = req.body;
    if (!req.file || !songNumber) {
      return res.status(400).json({ error: 'Missing file or songNumber' });
    }

    const fileContent = req.file.buffer.toString();
    const records = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      console.log("Parsing CSV file");
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      })
        .on('data', (data) => records.push(data))
        .on('error', reject)
        .on('end', resolve);
    });

    // Process and store the mapping
    const mapping = new Map();
    records.forEach((record, index) => {
      const lineNumber = record.note;
      const wordNumber = record.velocity;
      const word = record.word;
      
      const key = `L${lineNumber.padStart(2, '0')}W${wordNumber.padStart(2, '0')}`;
      console.log("Processing record:", { lineNumber, wordNumber, word, key });
      mapping.set(key, word);
    });

    // Save to file
    const songData = await saveSong(songNumber, mapping, songName, artist);
    res.json({ 
      message: 'Song mapping stored successfully',
      songData
    });
  } catch (error) {
    console.error('Error processing song:', error);
    res.status(500).json({ error: 'Failed to process song' });
  }
});

// GET endpoint to retrieve song mapping
app.get('/song/:songNumber', async (req, res) => {
  const { songNumber } = req.params;
  console.log("Retrieving song mapping for:", songNumber);
  
  try {
    const songData = await loadSong(songNumber);
    if (!songData) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json(songData);
  } catch (error) {
    console.error('Error loading song:', error);
    res.status(500).json({ error: 'Failed to load song' });
  }
});

// POST endpoint to trigger word change
app.post('/trigger', (req, res) => {
  console.log("Received word change request");
  const { wordId } = req.body;
  if (!wordId || !/^S\d{2}L\d{2}W\d{2}$/.test(wordId)) {
    console.log("Invalid word ID format");
    return res.status(400).json({ error: 'Invalid word ID format' });
  }

  // Extract song number from wordId
  const songNumber = wordId.substring(1, 3);
  const lineNumber = wordId.substring(4, 6);
  const wordNumber = wordId.substring(7, 9);

  // Broadcast to all connected clients
  io.emit('wordChange', {
    songNumber,
    lineNumber,
    wordNumber
  });

  res.json({ message: 'Word change triggered successfully' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

