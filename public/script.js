const socket = io('ws://localhost:3500', {
  transports: ['websocket'],
  upgrade: false
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
const usersList = $('.users-list'); 
const roomList = $('.room-list');    

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
          room: chatRoom.val()
      });
      msgInput.val('');
  }
}

function enterRoom(e) {
  e.preventDefault();
  if (nameInput.val() && chatRoom.val()) {
    const room = chatRoom.val();

    $.ajax({
      url: `http://localhost:1337/api/messages?filters[room][$eq]=${room}&sort=timestamp:asc`,
      method: 'GET',
      success: function(response) {
        console.log("Respuesta de Strapi:", response);
        if (response.data && response.data.length > 0) {
          response.data.forEach((msg) => {
            if (msg.attributes && msg.attributes.name) {
              const li = $('<li>').addClass('post');
              li.html(`
                <div class="post__header ${msg.attributes.name === nameInput.val() ? 'post__header--user' : 'post__header--reply'}">
                  <span class="post__header--name">${msg.attributes.name}</span> 
                  <span class="post__header--time">${new Date(msg.attributes.timestamp).toLocaleTimeString()}</span> 
                </div>
                <div class="post__text">${msg.attributes.text}</div>
              `);
              chatDisplay.append(li);
            }
          });
          chatDisplay.scrollTop(chatDisplay[0].scrollHeight);
        } else {
          console.log("No hay mensajes en esta sala.");
        }
      },
      error: function(error) {
        console.error('Error fetching messages:', error);
        alert('Error fetching messages. Please try again.');
      }
    });

    socket.emit('enterRoom', {
      name: nameInput.val(),
      room: chatRoom.val(),
    });
  }
}

socket.on('message', (data) => {
  activity.text('');
  const { name, text, time } = data;
  const li = $('<li>').addClass('post');
  if (name === nameInput.val()) li.addClass('post--left');
  if (name !== nameInput.val() && name !== 'Admin') li.addClass('post--right');
  if (name !== 'Admin') {
    li.html(`
      <div class="post__header ${name === nameInput.val() ? 'post__header--user' : 'post__header--reply'}">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
      </div>
      <div class="post__text">${text}</div>
    `);
  } else {
    li.html(`<div class="post__text">${text}</div>`);
  }
  chatDisplay.append(li);
  chatDisplay.scrollTop(chatDisplay[0].scrollHeight);
});

let activityTimer;
socket.on('activity', (name) => {
  activity.text(`${name} is typing...`);
  clearTimeout(activityTimer);
  activityTimer = setTimeout(() => {
    activity.text('');
  }, 3000);
});

socket.on('userList', ({ users }) => {
  showUsers(users);
});

socket.on('roomList', ({ rooms }) => {
  showRooms(rooms);
});

function showUsers(users) {
  usersList.text('');
  if (users) {
    usersList.html(`<em>Users in ${chatRoom.val()}:</em>`); 
    users.forEach((user, i) => {
      usersList.text(usersList.text() + `${user.name}`);
      if (users.length > 1 && i !== users.length - 1) {
        usersList.text(usersList.text() + ',');
      }
    });
  }
}

function showRooms(rooms) {
  roomList.text('');
  if (rooms) {
    roomList.html('<em>Active Rooms:</em>');
    rooms.forEach((room, i) => {
      roomList.text(roomList.text() + `${room}`);
      if (rooms.length > 1 && i !== rooms.length - 1) {
        roomList.text(roomList.text() + ',');
      }
    });
  }
}

$('.form-msg').on('submit', sendMessage);
$('.form-join').on('submit', enterRoom);
msgInput.on('keypress', () => {
  socket.emit('activity', nameInput.val());
});

$(document).ready(function () {
  $('#openChatBtn').click(function () {
    $('#chatContainer').toggle();
  });
});