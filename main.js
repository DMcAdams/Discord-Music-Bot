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

const DEFAULT_VOLUME = 30

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
    searchstring = trimPrefix(searchstring);
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
              volume: 10,
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
            message.channel.send(wrap("Added to queue: " + song.title));
            if (serverQueue.songs.length == 1){
                play(message, serverQueue);
            }
        }
        });

        


    }

    /*

    function play(guild, song) {
        const serverQueue = queue.get(guild.id);
        if (!song) {
          serverQueue.voiceChannel.leave();
          queue.delete(guild.id);
          return;
        }
      
        const dispatcher = serverQueue.connection
          .play(ytdl(song.url))
          .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
          })
          .on("error", error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
      }

 */

  function play(msg, serverQueue) {
		// If the queue is empty, finish.
		if (serverQueue.songs.length == 0) {
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
				let dispatcher = connection.play(ytdl(video.url , {filter: 'audioonly'}), {seek: 0, volume: (DEFAULT_VOLUME/100)});

				connection.on('error', (error) => {
					// Skip to the next song.
					console.log(error);
					//serverQueue.songs.shift();
					play(msg, serverQueue);
				});

				dispatcher.on('error', (error) => {
					// Skip to the next song.
					console.log(error);
					//serverQueue.songs.shift();
					play(msg, serverQueue);
				});

				dispatcher.on('finish', () => {
					// Wait a second.
                    console.log(`song over`);
					setTimeout(() => {
						if (serverQueue.songs.length > 0) {
							// Remove the song from the queue.
							//serverQueue.songs.shift();
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


async function helpMe(message){
    message.channel.send(wrap("No."));
}

function trimPrefix(str) {
    const prefix = "!play ";
    return str.slice(prefix.length)
}

function wrap(text){
    return "\`\`\`" + text + "\`\`\`"
}