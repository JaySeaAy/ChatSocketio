import express from 'express';
import { Server } from 'socket.io';
import axios from 'axios'; 
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3500;
const ADMIN = 'Admin';
const STRAPI_API_URL = 'http://127.0.0.1:1337';
const STRAPI_API_TOKEN = '96cdb41956b220f7aee12da1e6a5b25d69e92f0015d560b2e3a1e649b6cb6fdf881c1448686511348e2158cfcc1a8c8967a694ac17322d305bd166af3e1e112ed35ae9686bc797c57ebf78c8bef4956d082e71377556829e69d416b70dfd1726fe8ba496077836bf0b47f4b5ae74583b99d2ef422e29462b3b9f5d9b7c197cdc';


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
      origin: "*",
      methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

async function createRoomIfNotExists(roomName) {
  try {
    const checkRoom = await axios.get(`${STRAPI_API_URL}/api/rooms`, {
      params: {
        'filters[name][$eq]': roomName,
      },
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`, 
      },
    });

    if (checkRoom.data.data.length === 0) {
      const createResponse = await axios.post(
        `${STRAPI_API_URL}/api/rooms`,
        {
          data: {
            name: roomName,
            messages: [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return createResponse.data;
    }
    return checkRoom.data.data[0];
  } catch (error) {
    console.error('Error in createRoomIfNotExists:', error.response?.data || error.message);
    throw error;
  }
}

io.on('connection', (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.emit('message', buildMsg(ADMIN, 'Welcome to the chat!'));

  socket.on('enterRoom', async ({ name, room }) => {
    if (!name || !room) {
      console.error('Name or room is missing');
      return;
    }
    console.log('1. Iniciando enterRoom:', { name, room });
  
    try {
      console.log('2. Verificando sala existente');
      const roomData = await createRoomIfNotExists(room);
  
      const roomResponse = await axios.get(`${STRAPI_API_URL}/api/rooms`, {
        params: {
          'filters[name][$eq]': room
        }
      });
      console.log('3. Respuesta sala:', roomResponse.data);
  
      if (roomResponse.data.data.length === 0) {
        console.log('4. Creando nueva sala');
        await axios.post(`${STRAPI_API_URL}/api/rooms`, {
          data: {
            name: room
          }
        });
      }
  
      console.log('5. Activando usuario');
      const user = await activateUser(socket.id, name, room);
      console.log('6. Usuario activado:', user);
  
      console.log('7. Uniendo a sala');
      socket.join(room);
  
      console.log('8. Cargando mensajes');
      const messages = await fetchMessages(room);
      console.log('9. Mensajes cargados:', messages.length);
  
      socket.emit('message', buildMsg(ADMIN, `You have joined the ${room} chat room`));
  
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          socket.emit('message', buildMsg(msg.name, msg.content, msg.timestamp));
        }
      }
  
      socket.broadcast.to(room).emit('message', buildMsg(ADMIN, `${name} has joined the room`));
  
      const usersInRoom = await fetchUsersInRoom(room);
      io.to(room).emit('userList', { users: usersInRoom });
  
      const activeRooms = await fetchAllActiveRooms();
      io.emit('roomList', { rooms: activeRooms });
  
    } catch (error) {
      console.log('ERROR en paso:', error);
      throw error;
    }
  });

  
  socket.on('message', async ({ name, text }) => {
    const room = await getUserRoom(socket.id);
    if (room) {
      const timestamp = new Date().toISOString();
      io.to(room).emit('message', buildMsg(name, text, timestamp));
  
      await saveMessage(room, name, text, timestamp);
    }
  });

  socket.on('disconnect', async () => {
    const user = await getUser(socket.id);
    if (user) {
      await userLeavesApp(socket.id);
      io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
      io.to(user.room).emit('userList', { users: await fetchUsersInRoom(user.room) });
      io.emit('roomList', { rooms: await fetchAllActiveRooms() });
    }
    console.log(`User ${socket.id} disconnected`);
  });
});

function buildMsg(name, text, timestamp = new Intl.DateTimeFormat('default', {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
}).format(new Date())) {
  return {
    name,
    text,
    time: timestamp,
  };
}

async function activateUser(socket_id, name, roomName) {
  try {
    const roomResponse = await axios.get(`${STRAPI_API_URL}/api/rooms`, {
      params: {
        'filters[name][$eq]': roomName
      },
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`
      }
    });

    let roomId;
    if (roomResponse.data.data.length > 0) {
      roomId = roomResponse.data.data[0].id;
    } else {
      const createRoomResponse = await axios.post(`${STRAPI_API_URL}/api/rooms`, {
        data: {
          name: roomName
        }
      }, {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      roomId = createRoomResponse.data.data.id;
    }

    const existingUserResponse = await axios.get(`${STRAPI_API_URL}/api/usuarios`, {
      params: {
        'filters[socket_id][$eq]': socket_id
      },
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`
      }
    });

    if (existingUserResponse.data.data.length > 0) {
      await axios.put(`${STRAPI_API_URL}/api/usuarios/${existingUserResponse.data.data[0].id}`, {
        data: {
          name: name,
          room: roomId
        }
      }, {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      await axios.post(`${STRAPI_API_URL}/api/usuarios`, {
        data: {
          socket_id: socket_id,
          name: name,
          room: roomId
        }
      }, {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }

    return { socket_id, name, room: roomId };
  } catch (error) {
    console.error('Error en activateUser:', error);
    throw error;
  }
}

async function getUserRoom(id) {
  const response = await axios.get(`${STRAPI_API_URL}/api/usuarios/${id}`);
  return response.data.data.attributes.room;
}

async function fetchMessages(room) {
  const response = await axios.get(`${STRAPI_API_URL}/api/messages?filters[room][$eq]=${room}&sort=timestamp:asc`);
  return response.data.data.map(msg => msg.attributes);
}

async function fetchUsersInRoom(room) {
  const response = await axios.get(`${STRAPI_API_URL}/api/usuarios?filters[room][$eq]=${room}`);
  return response.data.data.map(user => user.attributes);
}

async function fetchAllActiveRooms() {
  const response = await axios.get(`${STRAPI_API_URL}/api/messages`);
  const rooms = new Set(response.data.data.map(msg => msg.attributes.room));
  return Array.from(rooms);
}

async function saveMessage(room, name, content, timestamp) {
  try {
    const userResponse = await axios.get(`${STRAPI_API_URL}/api/usuarios?filters[name][$eq]=${name}`);
    const userId = userResponse.data.data[0].id; // Obtener el ID del usuario

    const response = await axios.post(`${STRAPI_API_URL}/api/messages`, {
      data: {
        room: room,       // Relación con Room
        name: name,       // Nombre del usuario (opcional, porque tenemos la relación)
        content: content,
        timestamp: timestamp,
        usuario: userId   // Relación con Usuario
      }
    });
    console.log("Mensaje guardado en Strapi:", response.data);
  } catch (error) {
    console.error("Error al guardar el mensaje en Strapi:", error);
  }
}

async function userLeavesApp(id) {
  await axios.delete(`${STRAPI_API_URL}/api/usuarios/${id}`);
}

async function getUser(id) {
  const response = await axios.get(`${STRAPI_API_URL}/api/usuarios/${id}`);
  return response.data.data;
}