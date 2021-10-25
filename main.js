const mineflayer = require('mineflayer');
const autoeat = require("mineflayer-auto-eat")
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalNear } = require('mineflayer-pathfinder').goals
const blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
const collectBlock = require('mineflayer-collectblock').plugin
const inventoryViewer = require('mineflayer-web-inventory')
require('dotenv').config();

// Define Bot
const bot = mineflayer.createBot({host: process.env.host, username: `${process.env.clan}_1`, version: "1.17.1"})
bot.loadPlugin(blockFinderPlugin);
bot.loadPlugin(inventoryViewer)
bot.loadPlugin(autoeat);
bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)

// On Spawn Event
let mcData, defaultMove
bot.once("spawn", () => {
    mcData = require('minecraft-data')(bot.version)
    defaultMove = new Movements(bot, mcData)
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
            const target = bot.players[user] ? bot.players[user].entity : null
            if (!target) {
                bot.chat(' /pchat I cannot reach you, your out of render distance')
            } else {
                const position = target.position
                bot.pathfinder.setMovements(defaultMove)
                bot.pathfinder.setGoal(new GoalNear(position.x, position.y, position.z, 1))
            }
        }

        // Command To Have Bot Stop Moving
        else if (command === 'stop') {bot.navigate.stop();}

        // Command To Have Bot Sleep In Nearest Bed
        else if (command === "sleep") {
            goToSleep()
            async function goToSleep () {
                const bed = bot.findBlocks({matching: block => bot.isABed(block)})

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

        else if (command.startsWith("collect")){
            const args = command.split(" ")
            if (args === 1) {bot.chat(' /pchat invalid params')}

            const blockType = mcData.blocksByName[args[1]]
            if (!blockType){bot.chat(` /pchat Invalid block "${args[1]}" not found`)
                return;
            }

            const blocks = bot.findBlockSync({point: bot.entity.position, matching: blockType.id, maxDistance: 64, count: args[2]})
            if (!blocks.length){
                bot.chat('/pchat I dont see that block nearby')
                return;
            }

            const targets = []
            for (let i = 0; i < Math.min(blocks.length, args[2]); i++) {
                console.log(blocks[i].position)
                targets.push(bot.blockAt(blocks[i].position))
            }
            bot.chat(`/pchat Found ${targets.length} ${args[1]}`)

            bot.collectBlock.collect(targets, err => {
                if (err) {
                    // Log Error
                    bot.chat(` /pchat ${err.message}`)
                } else {
                    // Collected All Blocks
                    bot.chat(`Collected ${args[2]} ${args[1]}`)
                }
            })
        }

    }
});
