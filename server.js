const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 4747;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // फाइल्स दिखने के लिए
app.use(express.json());

// File Upload Setup (Multer) - फाइल्स को लोकली सेव करने के लिए
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // यूनिक नाम
    }
});
const upload = multer({ storage: storage });

// Messages Data File & Safety Check
const messagesFilePath = './data/messages.json';
const dataDir = './data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(messagesFilePath)) fs.writeFileSync(messagesFilePath, '[]');

// File Upload Endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ fileUrl: `/uploads/${req.file.filename}`, fileType: req.file.mimetype, fileName: req.file.originalname });
    } else {
        res.status(400).send('Upload failed');
    }
});

// 🔥 पैच: एक्टिव ऑनलाइन यूज़र्स को ट्रैक करने के लिए ऑब्जेक्ट
const onlineUsers = {};

// Socket.io Real-time Chat
io.on('connection', (socket) => {

    // 🔥 पैच: जब फ्रंटेंड (script.js) से यूज़र का नाम आएगा
    socket.on('join', (username) => {
        onlineUsers[socket.id] = username; // सॉकेट आईडी के साथ नाम मैप करें
        console.log(`🟢 ${username} online (Total Online: ${Object.keys(onlineUsers).length})`);
    });

    // पुरानी चैट्स भेजना
    const savedMessages = JSON.parse(fs.readFileSync(messagesFilePath, 'utf-8') || '[]');
    socket.emit('loadMessages', savedMessages);

    // नया मैसेज रिसीव करना
    socket.on('sendMessage', (messageData) => {
        const messages = JSON.parse(fs.readFileSync(messagesFilePath, 'utf-8') || '[]');
        messages.push(messageData);
        fs.writeFileSync(messagesFilePath, JSON.stringify(messages)); // लोकल सिस्टम पे सेव करना

        io.emit('receiveMessage', messageData); // सबको भेजना
    });

    // 🔥 पैच: जब यूज़र ब्राउज़र टैब बंद करेगा या ऑफलाइन जाएगा
    socket.on('disconnect', () => {
        const username = onlineUsers[socket.id] || "Anonymous";
        delete onlineUsers[socket.id]; // लिस्ट से हटाएँ
        console.log(`🔴 ${username} offline (Total Online: ${Object.keys(onlineUsers).length})`);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running beautifully on http://localhost:${PORT}`);
});