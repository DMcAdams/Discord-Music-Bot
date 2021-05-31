//required packages
//const { channel } = require('diagnostic_channel');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
//get auth data
const { prefix, token } = require('./auth.json');

//get discord client object
const client = new Discord.Client();

//holds queues for each server 
const queue = new Map();

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
	console.log(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`); 

  	client.user.setActivity("Just Vibin\'");
});

//message sent on server, most of the important stuff starts here
client.on("message", function(message){
    console.log(`message is created -> ${message}`);

    //if play command
    if (message.content.toLowerCase().startsWith(`${prefix}play`)){
        console.log('Play');
    }
    //if pause command
    else if (message.content.toLowerCase().startsWith(`${prefix}pause`)){
        console.log('Pause');
    }
    //if resume command
    else if (message.content.toLowerCase().startsWith(`${prefix}resume`)){
        console.log('Resume');
    }
    //if stop command
    else if (message.content.toLowerCase().startsWith(`${prefix}stop`)){
        console.log('Stop');
    }
    //if clear command
    else if (message.content.toLowerCase().startsWith(`${prefix}clear`)){
        console.log('Clear');
    }
    //if help command
    else if (message.content.toLowerCase().startsWith(`${prefix}help`)){
        console.log('HALP ME');
        helpMe(message);
    }
});



async function helpMe(message){
    message.channel.send(wrap("No."));
}

function wrap(text){
    return "\`\`\`" + text + "\`\`\`"
}