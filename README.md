# ChatSocketio

A real-time chat application with integrated video conferencing interface, built with Node.js, Express, and Socket.IO. [1](#0-0) 

## Features

- **Real-time messaging** using WebSocket connections.
- **Room-based chat system** where users can join specific "citas" (appointments).
- **User presence tracking** with join/leave notifications.
- **Integrated video conferencing interface** for appointment management.
- **Responsive web interface** using Bulma CSS framework.

## Technology Stack

- **Backend**: Node.js with Express.js server.
- **Real-time Communication**: Socket.IO with WebSocket transport. 
- **Frontend**: HTML5, CSS3, JavaScript with jQuery.
- **UI Framework**: Bulma CSS.
- **Notifications**: SweetAlert2.

## Installation & Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to `http://localhost:3500`.

## Usage

### Joining a Chat Room

1. Enter your name and room code in the chat form.
2. Click "Unirse" to join the chat room.
3. Start sending messages using the message input field.

### Video Conferencing Interface

The application includes an integrated interface for managing video appointments with features like:
- Appointment scheduling and management.
- Video call controls (record, stop, reconnect).
- Document management for appointments.

## Architecture

The application uses an in-memory `ciudadanos` object to track active users and their room assignments, with real-time message broadcasting to specific rooms using Socket.IO's room functionality [19](#0-18) .

## API Events

- `entrarCita`: Join a chat room with name and room code.
- `message`: Send a message to the current room.
- `disconnect`: Handle user disconnection and cleanup.

## Notes

The application is designed specifically for Spanish-speaking users, as evidenced by the Spanish language interface and terminology like "citas" (appointments) and "ciudadanos" (citizens). The chat interface is embedded within a larger video conferencing application designed for government or institutional appointment management.
