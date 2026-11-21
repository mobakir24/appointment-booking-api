// الاستخدام: node scripts/socket-listener.js [http://localhost:3000]
const { io } = require('socket.io-client');
const url = process.argv[2] || 'http://localhost:3000';
const socket = io(url, { path: '/socket.io' });
socket.on('connect', () => console.log('connected', socket.id));
socket.on('slot.booked', (p) => console.log('slot.booked  ', JSON.stringify(p)));
socket.on('slot.released', (p) => console.log('slot.released', JSON.stringify(p)));
socket.on('connect_error', (e) => console.error('connect_error', e.message));
