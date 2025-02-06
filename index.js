import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3500;
const ADMIN = 'Admin';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const expressServer = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const io = new Server(expressServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
});

const ciudadanos = {};

io.on('connection', (socket) => {
  socket.emit('message', buildMsg(ADMIN, 'Bienvenido al chat!'));

  socket.on('entrarCita', ({ name, cita }) => {
    if (!name || !cita) {
      console.error('Falta nombre o cita');
      return;
    }

    socket.join(cita);
    console.log(`Ciudadano ${name} se ha unido a la cita ${cita}`);

    ciudadanos[socket.id] = { name, cita };

    socket.to(cita).emit('message', buildMsg(ADMIN, `${name} se ha unido a la cita`));

    io.to(cita).emit('userList', {
      ciudadanos: Object.values(ciudadanos).filter((ciudadano) => ciudadano.cita === cita),
    });
  });

  socket.on('message', ({ name, text }) => {
    const cita = ciudadanos[socket.id]?.cita;
    if (cita) {
      const timestamp = new Date().toISOString();
      io.to(cita).emit('message', { name, text, time: timestamp });
    }
  });

  socket.on('disconnect', () => {
    const ciudadano = ciudadanos[socket.id];
    if (ciudadano) {
      const { name, cita } = ciudadano;

      socket.to(cita).emit('message', buildMsg(ADMIN, `${name} has left the room`));

      delete ciudadanos[socket.id];

      io.to(cita).emit('userList', {
        ciudadanos: Object.values(ciudadanos).filter((ciudadano) => ciudadano.cita === cita),
      });
    }
  });
});

function buildMsg(name, text, timestamp = new Date().toISOString()) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(new Date(timestamp)),
  };
}