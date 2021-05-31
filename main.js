//required packages
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
//get auth data
const { prefix, token } = require('./auth.json');

//get discord client object
const client = new Discord.Client();

//log in to discord with bot token
client.login(token);

/*event listeners*/

//error
client.on("error", function(error){
    console.error(`client's WebSocket encountered a connection error: ${error}`);
});

// bot disconnects
client.on("disconnect", function(event){
    console.log(`The WebSocket has closed and will no longer attempt to reconnect`);
});

//general warnings
client.on("warn", function(info){
    console.log(`warn: ${info}`);
});

// When bot is loaded and ready to start working
client.on("ready", function(){
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 

  	client.user.setActivity("Just Vibin\'");
});

//message sent on server, most of the important stuff starts here
client.on("message", function(message){
    console.log(`message is created -> ${message}`);
});