var { Pool } = require('pg');

var pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Add this in your .env
  ssl: { rejectUnauthorized: false } // Needed for Render PostgreSQL
});

var fs = require('fs');
var fastify = require("fastify")();
var fastifyCors = require("@fastify/cors");

function initDB() {
  var { Pool } = require('pg');
  var pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      tank TEXT NOT NULL,
      ip TEXT,
      info JSONB,
      nov INTEGER DEFAULT 1
    );
  `)
  .then(() => {
    console.log("✅ messages table ensured");
    pool.end();
  })
  .catch(err => {
    console.error("❌ Error ensuring table:", err);
    pool.end();
  });
}

initDB(); // <--- Call it at startup

// Enable CORS
fastify.register(fastifyCors, {
  origin: "*", // Allow all origins (update as needed for security)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Specify allowed HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
});

// Define a function to read messages from the JSON file
function readMessagesFromFile() {
  try {
    var messagesData = fs.readFileSync('messages.json');
    return JSON.parse(messagesData);
  } catch (error) {
    return { messages: [] };
  }
}

async function readMessagesFromDB() {
  var res = await pool.query('SELECT * FROM messages');
  return res.rows;
};

// Define a function to write messages to the JSON file
function writeMessagesToFile(messages) {
  try {
    fs.writeFileSync('messages.json', JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('Error writing messages to file:', error);
  }
}

// Define a route to add a message
fastify.get("/api/addMessage", async (request, reply) => {
  var { name, tank, info } = request.query;
  var ip = request.headers['x-forwarded-for'] || request.ip || null;
  ip = ip.split(',')[0];
  console.log(ip);
  if (!name || !tank) {
    return reply.code(400).send({ error: "Both name and tank are required" });
  }

  // Read current messages from file
  var messages = readMessagesFromFile();

  // Check if a message with the same name already exists
  var existingMessageIndex = messages.messages.findIndex(message => message.name === name);

  if (existingMessageIndex !== -1) {
    // If message with the same name exists
    var existingMessage = messages.messages[existingMessageIndex];

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

  //var { name, tank, info } = request.query;
  //var ip = (request.headers['x-forwarded-for'] || request.ip || '').split(',')[0];

  if (!name || !tank) {
    return reply.code(400).send({ error: "Both name and tank are required" });
  }

  var existing = await pool.query('SELECT * FROM messages WHERE name = $1', [name]);

  if (existing.rows.length > 0) {
    var msg = existing.rows[0];
    let existingTank = msg.tank;
    if (!existingTank.includes(tank)) {
      existingTank += `, ${tank}`;
    }

    let parsedInfo = JSON.parse(info);
    let mergedInfo = msg.info || {};
    let oM = mergedInfo.messages;
    let oP = mergedInfo.patata;
    let oF = mergedInfo.friends || [];

    if (!parsedInfo.friends?.length) {
      parsedInfo.friends = oF;
    }
    if (oM) parsedInfo.messages = oM + parsedInfo.messages;
    if (oP) parsedInfo.patata = oP + parsedInfo.patata;

    await pool.query(`
      UPDATE messages SET tank = $1, info = $2, nov = nov + 1,
      ip = CASE WHEN position($3 in ip) = 0 THEN ip || ', ' || $3 ELSE ip END
      WHERE name = $4
    `, [existingTank, parsedInfo, ip, name]);

  } else {
    await pool.query(`
      INSERT INTO messages (name, tank, ip, info)
      VALUES ($1, $2, $3, $4)
    `, [name, tank, ip, JSON.parse(info)]);
  }
  
  reply.send({ message: "Message added successfully" });
});

var MY_SECRET_KEY = process.env.MY_SECRET_KEY;

// Define a route to view all messages
fastify.get("/api/viewMessages", async (request, reply) => {
  var apiKey = request.headers['authorization'] || request.query.key;
  if (apiKey !== MY_SECRET_KEY) {
    return reply.code(403).send({ error: "Unauthorized" });
  };
  // Read messages from file
  var messages = readMessagesFromFile();
  var apiKey = request.headers['authorization'] || request.query.key;
  if (apiKey !== MY_SECRET_KEY) {
    return reply.code(403).send({ error: "Unauthorized" });
  }
  var rows = await readMessagesFromDB();
  reply.send({ messages: messages.messages });
});

// Define a route to reset messages
fastify.get("/api/resetMessages", async (request, reply) => {
  // Reset messages by overwriting the file with an empty array
  writeMessagesToFile({ messages: [] });
  await pool.query('DELETE FROM messages');
  reply.send({ message: "Messages reset successfully" });
});

// Run the server and listen on a specific port
var PORT = process.env.PORT || 3000;

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening on ${address}`);
});
