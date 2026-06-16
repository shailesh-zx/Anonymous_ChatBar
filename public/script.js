const socket = io();

// 1. 🔥 बदलाव: localStorage हटा दिया है, अब हर रिफ्रेश पर नाम पूछेगा
let username = prompt("Please enter your name to join the chat:");
if (!username) {
    username = "User_" + Math.floor(Math.random() * 1000); // अगर नाम नहीं डाला तो रैंडम नाम
}

// हेडर में यूज़र का नाम दिखाना और सर्वर को बताना कि यह यूज़र ऑनलाइन आ चुका है
const userDisplay = document.getElementById('user-display');
if (userDisplay) {
    userDisplay.innerText = `Logged in as: ${username}`;
}
socket.emit('join', username); // सर्वर को नाम भेजना ताकि टर्मिनल में ऑनलाइन दिखे

const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const recordBtn = document.getElementById('record-btn');

// पुरानी चैट्स लोड करना
socket.on('loadMessages', (messages) => {
    chatBox.innerHTML = ''; // रीलोड होने पर मैसेज डुप्लीकेट न हों
    messages.forEach(msg => displayMessage(msg));
});

// नया मैसेज रिसीव करना
socket.on('receiveMessage', (msg) => {
    displayMessage(msg);
});

// टेक्स्ट मैसेज भेजना
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text) {
        const msgData = { type: 'text', content: text, sender: username }; 
        socket.emit('sendMessage', msgData);
        messageInput.value = '';
    }
});

// इनपुट बॉक्स में Enter की दबाने पर मैसेज अपने आप सेंड हो जाए
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

// फाइल, फोटो, वीडियो, डॉक्यूमेंट भेजना
fileInput.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
        
        let type = 'file';
        if(data.fileType.startsWith('image/')) type = 'image';
        else if(data.fileType.startsWith('video/')) type = 'video';
        else if(data.fileType.startsWith('audio/')) type = 'audio';

        const msgData = { type: type, content: data.fileUrl, fileName: data.fileName, sender: username };
        socket.emit('sendMessage', msgData);
    } catch (err) {
        console.error("Upload Error:", err);
    }
});

// Voice Chat (ऑडियो रिकॉर्डिंग)
let mediaRecorder;
let audioChunks = [];

recordBtn.addEventListener('click', async () => {
    if (recordBtn.classList.contains('recording')) {
        mediaRecorder.stop();
        recordBtn.classList.remove('recording');
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const file = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
                
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/upload', { method: 'POST', body: formData });
                const data = await response.json();
                
                const msgData = { type: 'audio', content: data.fileUrl, sender: username };
                socket.emit('sendMessage', msgData);
            };

            mediaRecorder.start();
            recordBtn.classList.add('recording');
        } catch (err) {
            alert('Microphone access denied or not available!');
        }
    }
});

// UI में मैसेज दिखाना (नाम के साथ)
function displayMessage(msg) {
    const div = document.createElement('div');
    
    // चेक करना कि मैसेज खुद ने भेजा है या किसी और ने
    const isSent = msg.sender === username; 
    div.className = `message ${isSent ? 'sent' : 'received'}`;

    // अगर किसी और का मैसेज है, तो उसका नाम दिखाएं
    let nameLabel = '';
    if (!isSent) {
        nameLabel = `<div class="sender-name">${msg.sender}</div>`;
    }

    let contentHTML = '';
    if (msg.type === 'text') {
        contentHTML = msg.content;
    } else if (msg.type === 'image') {
        contentHTML = `<img src="${msg.content}" alt="Image">`;
    } else if (msg.type === 'video') {
        contentHTML = `<video controls src="${msg.content}"></video>`;
    } else if (msg.type === 'audio') {
        contentHTML = `<audio controls src="${msg.content}"></audio>`;
    } else {
        contentHTML = `<a href="${msg.content}" target="_blank" style="color: white; text-decoration: underline;"><i class="fa-solid fa-file"></i> ${msg.fileName || 'Download File'}</a>`;
    }

    div.innerHTML = nameLabel + contentHTML;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}