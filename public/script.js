const socket = io('ws://localhost:3500', {
  transports: ['websocket'],
  upgrade: false,
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  alert('Error connecting to the server. Please try again.');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  alert('You have been disconnected from the server.');
});

const msgInput = $('#message');
const nameInput = $('#name');
const chatRoom = $('#room');
const activity = $('.activity');
const chatDisplay = $('.chat-display');
const listaCiudadanos = $('.users-list');

// Enviar mensaje
function sendMessage(e) {
  e.preventDefault();
  if (!msgInput.val().trim()) {
    alert('Message cannot be empty');
    return;
  }
  if (nameInput.val() && msgInput.val() && chatRoom.val()) {
    socket.emit('message', {
      name: nameInput.val(),
      text: msgInput.val(),
    });
    msgInput.val('');
  }
}

// Unirse a una sala
function entrarCita(e) {
  e.preventDefault();
  if (nameInput.val() && chatRoom.val()) {
    socket.emit('entrarCita', {
      name: nameInput.val(),
      cita: chatRoom.val(),
    });
  }
}

socket.on('message', (data) => {
  console.log('Datos recibidos:', data); // Verificar el contenido de `data`
  const { name, text, time } = data;
  console.log('Tiempo recibido:', time); // Verificar el valor de `time`

  const li = $('<li>').addClass('post');

  // Verificar si el tiempo es válido
  let formattedTime = 'Hora desconocida';
  if (time) {
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      // Formatear la hora en formato HH:mm
      formattedTime = new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
  }

  // Determinar si el mensaje es del usuario actual o de otro
  if (name === nameInput.val()) {
    li.addClass('post--right'); // Mensajes propios a la derecha
  } else {
    li.addClass('post--left'); // Mensajes de otros a la izquierda
  }

  // Construir el mensaje
  li.html(`
    <div class="post__text">
      ${text}
      <div class="post__header--time">${formattedTime}</div>
    </div>
  `);

  // Agregar el mensaje al chat
  chatDisplay.append(li);
  chatDisplay.scrollTop(chatDisplay[0].scrollHeight);
});

// Mostrar actividad (usuario escribiendo)
let activityTimer;
socket.on('activity', (name) => {
  activity.text(`${name} is typing...`);
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.text('');
  }, 3000);
});

// Mostrar lista de usuarios en la sala
socket.on('listaCiudadanos', ({ ciudadanos }) => {
  listaCiudadanos.text('');
  if (users) {
    listaCiudadanos.html(`<em>Users in ${chatRoom.val()}:</em>`);
    ciudadanos.forEach((ciudadano, i) => {
      listaCiudadanos.text(listaCiudadanos.text() + `${ciudadano.name}`);
      if (ciudadanos.length > 1 && i !== ciudadanos.length - 1) {
        listaCiudadanos.text(listaCiudadanos.text() + ',');
      }
    });
  }
});

// Manejar envío de mensajes y unión a salas
$('.form-msg').on('submit', sendMessage);
$('.form-join').on('submit', entrarCita);
msgInput.on('keypress', () => {
  socket.emit('activity', nameInput.val());
});

// Mostrar/ocultar el chat
$(document).ready(function () {
  $('#openChatBtn').click(function () {
    $('#chatContainer').toggle();
  });
});