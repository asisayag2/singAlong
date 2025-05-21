const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const { parse } = require('csv-parse');
const cors = require('cors');
const fs = require('fs');

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

// In-memory storage for song mappings
const songMappings = new Map();

// Configure multer for CSV file upload
const upload = multer({ storage: multer.memoryStorage() });

// POST endpoint to receive song mapping
app.post('/song', upload.single('file'), async (req, res) => {
  try {
    const { songNumber } = req.body;
    if (!req.file || !songNumber) {
      return res.status(400).json({ error: 'Missing file or songNumber' });
    }

    const fileContent = req.file.buffer.toString();
    const records = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
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
      mapping.set(key, word);
    });

    songMappings.set(songNumber, mapping);
    res.json({ message: 'Song mapping stored successfully' });
  } catch (error) {
    console.error('Error processing song:', error);
    res.status(500).json({ error: 'Failed to process song' });
  }
});

// POST endpoint to trigger word change
app.post('/trigger', (req, res) => {
  const { wordId } = req.body;
  if (!wordId || !/^S\d{2}L\d{2}W\d{2}$/.test(wordId)) {
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

// GET endpoint to retrieve song mapping
app.get('/song/:songNumber', (req, res) => {
  const { songNumber } = req.params;
  const mapping = songMappings.get(songNumber);

  if (!mapping) {
    return res.status(404).json({ error: 'Song not found' });
  }

  // Convert mapping to array of objects
  const response = Array.from(mapping.entries()).map(([key, word]) => ({
    word, 
    lineNumber: key.substring(1, 3),
    wordNumber: key.substring(4, 6)
  }));

  res.json(response);
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