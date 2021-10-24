const mineflayer = require('mineflayer');
const navigatePlugin = require('mineflayer-navigate')(mineflayer);
const autoeat = require("mineflayer-auto-eat")
const blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
require('dotenv').config();

// Define Bot
const bot = mineflayer.createBot({host: process.env.host, username: `${process.env.clan}_1`, version: "1.17.1"})
navigatePlugin(bot);
bot.loadPlugin(autoeat);
bot.loadPlugin(blockFinderPlugin);
bot.on("autoeat_started", () => {console.log("Auto Eat started!")})
bot.on("autoeat_stopped", () => {console.log("Auto Eat stopped!")})

// On Spawn Event
bot.once("spawn", () => {
    bot.autoEat.options = {priority: "foodPoints", startAt: 14, bannedFood: [],}
    setTimeout(() => bot.chat("/login slave_1"), 5000)
    // setTimeout(() => bot.chat(`/ptp ${process.env.username}`), 7500)
})

// Monitor Health Event
bot.on("health", () => {
    if (bot.food === 20) bot.autoEat.disable()
    // Disable the plugin if the bot is at 20 food points
    else bot.autoEat.enable() // Else enable the plugin again
})

// Navigation Events
bot.navigate.on('pathFound', function (path) {bot.chat(" /pchat found path. I can get there in " + path.length + " moves.");});
bot.navigate.on('cannotFind', function (closestPath) {bot.chat(" /pchat unable to find path. getting as close as possible");bot.navigate.walk(closestPath);});
bot.navigate.on('arrived', function () {bot.chat(" /pchat I have arrived");});
bot.navigate.on('interrupted', function () {bot.chat(" /pchat stopping");});

// On Chat Event
bot.on('chat', function (username, message) {
    // Parse Party Chat Commands Only
    if (username === "P"){
        const partyMessage = message.split("→")
        const user = partyMessage[0].substring(0, partyMessage[0].length - 1)
        const command = partyMessage[1].substring(1)

        // Command To Have Bot Pathfind To Player Who Ran Command
        if (command === 'come') {
            const target = bot.players[user].entity;
            if (!target) return;
            bot.navigate.to(target.position);
        }

        // Command To Have Bot Stop Moving
        else if (command === 'stop') {bot.navigate.stop();}
    }
});
