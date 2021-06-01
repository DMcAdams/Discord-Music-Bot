//required packages
//const { channel } = require('diagnostic_channel');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const youtubedl = require('youtube-dl-exec');
//get auth data
const { prefix, token } = require('./auth.json');

//get discord client object
const client = new Discord.Client();

//holds queues for each server 
const queue = new Map();

const DEFAULT_VOLUME = 30;
let currentVolume = 0;

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
    //console.log(`message is created -> ${message}`);
    
    //get queue for the user's server
    const serverQueue = queue.get(message.guild.id)

    //if play command
    if (message.content.toLowerCase().startsWith(`${prefix}play`)){
        console.log('Play');
        execute(message, serverQueue)
    }
    //if pause command
    else if (message.content.toLowerCase().startsWith(`${prefix}pause`)){
        console.log('Pause');
        pause(message);
        pause(message);
        message.channel.send(wrap("Music is paused"));
    }
    //if resume command
    else if (message.content.toLowerCase().startsWith(`${prefix}resume`)){
        console.log('Resume');
        //This works and I dont know why
        //just dont remove the extra pause/resume or it breaks
        resume(message);
        pause(message);
        resume(message);
        message.channel.send(wrap("Music resumed"));
    }
    //if skip command
    else if (message.content.toLowerCase().startsWith(`${prefix}skip`)){
        console.log('skip');
        play(message, serverQueue);
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
    //if volume command
    else if (message.content.toLowerCase().startsWith(`${prefix}volume`)){
        console.log('volume');
        volume(message, serverQueue);
    }
    //special command 
    else if (message.content.toLowerCase().startsWith(`${prefix}noice`)){
        message.content = "!play https://www.youtube.com/watch?v=a8c5wmeOL9o";
        execute(message, serverQueue);
    }
});

async function execute(message, serverQueue) {
  
    //check if user is in a voice channel
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send(
        "You need to be in a voice channel to play music!"
      );

    //check if bot has the proper permissions
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send(
        "I need the permissions to join and speak in your voice channel!"
      );
    }

    //used to differentiate between searches and URLs
    var isUrl = true;

    //remove prefix from command
    var searchstring = message.content;
    searchstring = trimPrefix(searchstring, "!play ");
    //if not a url
    if (!searchstring.toLowerCase().startsWith('http')) {
        searchstring = 'ytsearch1:' + searchstring;
        isUrl = false;
    }
    console.log(`Search String: ${searchstring}`)
 
    //search for a video
    youtubedl(searchstring, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    noCheckCertificate: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
    referer: 'https://example.com'
  })
    .then( async (info) => {
         console.log(info);
         
         //extract song info, formatting is different depending on wether a search string or URL is provided
         if (isUrl){
            var song = {
                title: info.title,
                url: info.webpage_url
            };
            console.log(song);
         }
         else {
            var song = {
                title: info.entries[0].title,
                url: info.entries[0].webpage_url
            };
            console.log(song);
         }

         //if no queue for the server
         if (!serverQueue) {
             //make a new one
            const queueContruct = {
              textChannel: message.channel,
              voiceChannel: voiceChannel,
              connection: null,
              songs: [],
              volume: DEFAULT_VOLUME,
              playing: true
            };
            
            //set the data
            queue.set(message.guild.id, queueContruct);
            //add the song
            queueContruct.songs.push(song);

             play(message, queueContruct);
        }
        //if queue already exists just add the song
        else {
            serverQueue.songs.push(song);
            //only play if music is not currently playing 
            if (!client.voice.connections.find(val => val.channel.guild.id === message.guild.id)){
                play(message, serverQueue);
            }
            else {
                message.channel.send(wrap("Added to queue: " + song.title));
            }
        }
        });

        


    }


  function play(msg, serverQueue) {
		// If the queue is empty, finish.
        console.log(`Queue length: ${serverQueue.songs.length}`);
		if (!serverQueue.songs.length) {
			msg.channel.send(wrap('Playback finished.'));

			// Leave the voice channel.
			const voiceConnection = client.voice.connections.find(val => val.channel.guild.id === msg.guild.id);
            console.log(voiceConnection);
			if (voiceConnection !== null) return voiceConnection.disconnect();

		}

		new Promise((resolve, reject) => {
			// Join the voice channel if not already in one.
			const voiceConnection = client.voice.connections.find(val => val.channel.guild.id == msg.guild.id); //const voiceConnection = null;
            console.log(voiceConnection);
			if (voiceConnection === null || voiceConnection === void 0) {
                //console.log(`voiceConnection is null!`);

				// Check if the user is in a voice channel.
                voiceChannel = msg.member.voice.channel
				if (msg.member.voice.channel) {
					msg.member.voice.channel.join().then(connection => {
                        console.log("Connected to Voice Channel");
						resolve(connection);
					}).catch((error) => {
						console.log(error);
					});
				} else {
					// Otherwise, clear the queue and do nothing.
					serverQueue.songs.splice(0, serverQueue.songs.length);
                    console.log("Failed to join voice channel");
					reject();
				}
			} else {
				resolve(voiceConnection);
			}
		}).then(connection => {
			// Get the first item in the queue.
			const video = serverQueue.songs.pop();
			//console.log(video.url);

			// Play the video.
			msg.channel.send(wrap('Now Playing: ' + video.title)).then(() => {
				let dispatcher = connection.play(ytdl(video.url , {filter: 'audioonly'}), {seek: 0, volume: (serverQueue.volume/100)});
                //if error
				connection.on('error', (error) => {
					// Skip to the next song.
					play(msg, serverQueue);
				});
                //if error
				dispatcher.on('error', (error) => {
					// Skip to the next song.
					play(msg, serverQueue);
				});
                //when song is finished
				dispatcher.on('finish', () => {
					// Wait a second.
                    console.log(`song over`);
					setTimeout(() => {
						if (1) {
							// Play the next song in the queue.
							play(msg, serverQueue);
						}
					}, 100);
				});
			}).catch((error) => {
				console.log(error);
			});
		}).catch((error) => {
			console.log(error);
		});
	}

function pause(message){
    const voiceConnection = client.voice.connections.find(val => val.channel.guild.id == message.guild.id);
    if (voiceConnection === null || voiceConnection === void 0){
        message.channel.send(wrap("There is no music playing"));
    }
    else {
        const dispatcher = voiceConnection.dispatcher;
		if (!dispatcher.paused) dispatcher.pause();
        //message.channel.send(wrap("Music is paused"));
    }

}

function resume(message){
    const voiceConnection = client.voice.connections.find(val => val.channel.guild.id == message.guild.id);
    if (voiceConnection === null || voiceConnection === void 0){
        message.channel.send(wrap("There is no music playing"));
    }
    else {
        const dispatcher = voiceConnection.dispatcher;
		if (dispatcher.paused){ 
            message.guild.me.voice.connection.dispatcher.resume()
            //dispatcher.resume();
            //message.channel.send(wrap("Music resumed"));
        }
    }

}

function volume(message, serverQueue){

    //trim prefix, then attempt to parse it as an int
    let nVolume = parseInt(trimPrefix(message.content, "!volume "));

    console.log(`Volume: ${nVolume}`);

    //if invalid number
    if(!nVolume || nVolume < 0 || nVolume > 100){
        message.channel.send(wrap("Please enter a valid number between 0 and 100"))
        return;
    }

    //if bot is active in server
    if (serverQueue){
        serverQueue.volume = nVolume;
    }
    else {
        message.channel.send(wrap("Error: please play a song first to set up the bot"));
        return;
    }
    //if bot is playing music
    const voiceConnection = client.voice.connections.find(val => val.channel.guild.id == message.guild.id);
    if (voiceConnection === null || voiceConnection === void 0){
        console.log(`Volume: not in VC`);
    }  
    else {
        //set current volume
        voiceConnection.dispatcher.setVolume(nVolume/100);
    }

    message.channel.send(wrap("Volume updated."));
}
async function helpMe(message){
    message.channel.send(wrap("No."));
}

function trimPrefix(str, prefix) {
    //const prefix = "!play ";
    return str.slice(prefix.length)
}

function wrap(text){
    return "\`\`\`" + text + "\`\`\`"
}