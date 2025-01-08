const fs = require('fs');
const fastify = require("fastify")();
const fastifyCors = require("@fastify/cors");

// Enable CORS
fastify.register(fastifyCors, {
  origin: "*", // Allow all origins (update as needed for security)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Specify allowed HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
});

// Define a function to read messages from the JSON file
function readMessagesFromFile() {
  try {
    const messagesData = fs.readFileSync('messages.json');
    return JSON.parse(messagesData);
  } catch (error) {
    return { messages: [] };
  }
}

// Define a function to write messages to the JSON file
function writeMessagesToFile(messages) {
  try {
    fs.writeFileSync('messages.json', JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('Error writing messages to file:', error);
  }
}

// Define a route to add a message
fastify.get("/api/addMessage", (request, reply) => {
  const { name, tank, info } = request.query;
  var ip = request.headers['x-forwarded-for'] || request.ip || null;
  ip = ip.split(',')[0];
  console.log(ip);
  if (!name || !tank) {
    return reply.code(400).send({ error: "Both name and tank are required" });
  }

  // Read current messages from file
  const messages = readMessagesFromFile();
  
  // Check if a message with the same name already exists
  const existingMessageIndex = messages.messages.findIndex(message => message.name === name);
  
  if (existingMessageIndex !== -1) {
    // If message with the same name exists
    const existingMessage = messages.messages[existingMessageIndex];
    
    console.log(existingMessage);
    
    // Check if the tank is different
    if (!existingMessage.tank.includes(tank)) {
      // Add another tank
      existingMessage.tank += `, ${tank}`;
    };
    /*if (!existingMessage?.info?.includes(info)) {
      existingMessage.info += `, ${info}`;
    };*/
    var oM = existingMessage?.info?.messages;
    var oP = existingMessage?.info?.patata;
    console.log(existingMessage, JSON.parse(info));
    if (!existingMessage?.info?.friends) {
      existingMessage.info.friends = [];
    };
    if (existingMessage?.info?.friends?.length < 1) {
      existingMessage.info = JSON.parse(info);
      if (oM) {
        existingMessage.info.messages = oM + existingMessage.info.messages;
      };
      if (oP) {
        existingMessage.info.patata = oP + existingMessage.info.patata;
      };
    } else {
      if (JSON.parse(info)?.info?.friends?.length > 0) {
        existingMessage.info = JSON.parse(info);
        if (oM) {
          existingMessage.info.messages = oM + existingMessage.info.messages;
        };
        if (oP) {
          existingMessage.info.patata = oP + existingMessage.info.patata;
        };
      } else {
        var oF = existingMessage.info.friends;
        existingMessage.info = JSON.parse(info);
        existingMessage.info.friends = oF;
        if (oM) {
          existingMessage.info.messages = oM + existingMessage.info.messages;
        };
        if (oP) {
          existingMessage.info.patata = oP + existingMessage.info.patata;
        };
      };
    };
    
    // Increment NoV
    existingMessage.NoV = (existingMessage.NoV || 0) + 1;
    existingMessage.ip = (!existingMessage?.ip?.includes(ip) ? existingMessage.ip + ', ' + ip : existingMessage?.ip);
    
    //if (!existingMessage.ip) {
    //  existingMessage.ip = ip.split(',')[0];
    //} else {
    //  if (!existingMessage.ip.includes(ip.split(',')[0])) {
    //    existingMessage.ip += ', ' + ip.split(',')[0];
    //  };
    //}
    
    /*if (!existingMessage.ip2) {
      existingMessage.ip2 = ip.split(',')[1];
    } else {
      if (!existingMessage.ip.includes(ip.split(',')[1])) {
        existingMessage.ip2 += ', ' + ip.split(',')[1];
      };
    }
    
    if (!existingMessage.ip3) {
      existingMessage.ip3 = ip.split(',')[2];
    } else {
      if (!existingMessage.ip.includes(ip.split(',')[2])) {
        existingMessage.ip3 += ', ' + ip.split(',')[2];
      };
    }*/
  } else {
    // If message with the same name does not exist, add new message
  //  var ipp2 = ip.split(',')[1];
  //  var ipp3 = ip.split(',')[2];
    messages.messages.push({ id: messages.messages.length + 1, NoV: 1, name, tank, ip, info/*, ipp2, ipp3*/ });
  }
  
  
  
  // Write updated messages to file
  writeMessagesToFile(messages);

  reply.send({ message: "Message added successfully" });
});

// Define a route to view all messages
fastify.get("/api/viewMessages", (request, reply) => {
  // Read messages from file
  const messages = readMessagesFromFile();
  reply.send({ messages: messages.messages });
});

// Define a route to reset messages
fastify.get("/api/resetMessages", (request, reply) => {
  // Reset messages by overwriting the file with an empty array
  writeMessagesToFile({ messages: [] });
  reply.send({ message: "Messages reset successfully" });
});

// Run the server and listen on a specific port
fastify.listen(process.env.PORT || 3000, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});