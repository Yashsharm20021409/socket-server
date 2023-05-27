// we will create new server for socket.io (for chatting feature)
const socketIO = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

require("dotenv").config({
    path: "./.env",
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello world from socket server!");
});

let users = [];

// add user in socket
const addUser = (userId, socketId) => {
    !users.some((user) => user.userId === userId) &&
        users.push({ userId, socketId });
};

// remove user from socket
const removeUser = (socketId) => {
    // store only those  in users array whose socketId is not matched with current user
    users = users.filter((user) => user.socketId !== socketId);
};

// to get user from socket for processing
const getUser = (receiverId) => {
    return users.find((user) => user.userId === receiverId);
};

// Define a message object with a seen property
const createMessage = ({ senderId, receiverId, text, images }) => ({
    senderId,
    receiverId,
    text,
    images,
    seen: false,
});

// creating connection
io.on("connection", (socket) => {
    // when connect
    console.log(`a user is connected`);

    // take userId and socketId from User
    // addUser is a function which we have use in frontend for add user in socket (it is like a route /create-user)
    socket.on("addUser", (userId) => {
        addUser(userId, socket.id);
        // emit is like  dispatch (to dispatch something/function)
        io.emit("getUsers", users);
    });

    // send and get message
    const messages = {}; // Object to track messages sent to each user
    socket.on("sendMessage", ({ senderId, receiverId, text, images }) => {
        const message = createMessage({ senderId, receiverId, text, images });

        const user = getUser(receiverId);

        // stores the messages in the messages object
        if (!messages[receiverId]) {
            messages[receiverId] = [message];
        } else {
            messages[receiverId].push(message);
        }

        // send message to the reciever
        io.to(user?.socketId).emit("getMessage", message);
    });

    socket.on("messageSeen", ({ senderId, receiverId, messageId }) => {
        const user = getUser(senderId);

        // update the seen flag for the message
        if (messages[senderId]) {
            // find that message in messages object whose condition get satisfy
            const message = messages[senderId].find(
                (message) =>
                    message.receiverId === receiverId && message.id === messageId
            );
            if (message) {
                message.seen = true;

                // send a message seen event to the sender
                io.to(user?.socketId).emit("messageSeen", {
                    senderId,
                    receiverId,
                    messageId,
                });
            }
        }
    });

    // update and get last message
    socket.on("updateLastMessage", ({ lastMessage, lastMessagesId }) => {
        io.emit("getLastMessage", {
            lastMessage,
            lastMessagesId,
        });
    });

    //when disconnect
    socket.on("disconnect", () => {
        console.log(`a user disconnected!`);
        removeUser(socket.id);
        io.emit("getUsers", users);
    });
});

server.listen(process.env.PORT || 4000, () => {
    console.log(`server is running on port ${process.env.PORT || 4000}`);
});
