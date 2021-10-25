const mineflayer = require('mineflayer');
const navigatePlugin = require('mineflayer-navigate')(mineflayer);
const autoeat = require("mineflayer-auto-eat")
const blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
const inventoryViewer = require('mineflayer-web-inventory')
require('dotenv').config();

// Define Bot
const bot = mineflayer.createBot({host: process.env.host, username: `${process.env.clan}_1`, version: "1.17.1"})
bot.loadPlugin(blockFinderPlugin);
bot.loadPlugin(navigatePlugin);
bot.loadPlugin(inventoryViewer)
bot.loadPlugin(autoeat);

// On Spawn Event
bot.once("spawn", () => {
    mcData = require('minecraft-data')(bot.version)
    bot.autoEat.options = {priority: "foodPoints", startAt: 14, bannedFood: [],}
    setTimeout(() => bot.chat("/login slave_1"), 5000)
    // setTimeout(() => bot.chat(`/ptp ${process.env.username}`), 7500)
})
let mcData

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
        if (username === bot.username) return;
        const partyMessage = message.split("→")
        const user = partyMessage[0].substring(0, partyMessage[0].length - 1)
        const command = partyMessage[1].substring(1)

        // Command To List ALl Bots Items
        if (command === 'list'){
            // Function To Convert Item To String Name And Count
            function itemToString (item) {
                if (item) {
                    return `${item.name} x ${item.count}`
                } else {
                    return '(nothing)'
            }}
            const items = bot.inventory.items().map(itemToString).join(', ')
            if (items) {
                bot.chat(` /pchat ${items}`)
            } else {
                bot.chat(' /pchat Empty')
            }
        }

        // Command To Have Bot Navigate To Player Who Ran Command
        else if (command === 'come') {
            const target = bot.players[user].entity;
            if (!target) return;
            bot.navigate.to(target.position);
        }

        // Command To Have Bot Stop Moving
        else if (command === 'stop') {bot.navigate.stop();}

        // Command To Have Bot Sleep In Nearest Bed
        else if (command === "sleep") {
            goToSleep()
            async function goToSleep () {
                const bed = bot.findBlocks({matching: block => bot.isABed(block)})
                console.log(bed)

                if (!bed.length){
                    bot.chat(' /pchat No Nearby Beds')
                } else {
                    try {
                        await bot.sleep(bot.blockAt(bed[0]))
                        bot.chat(' /pchat sleeping')
                    } catch (err){
                        bot.chat(` /pchat I can't sleep: ${err.message}`)
                    }
                }
            }
        }

    }
});
