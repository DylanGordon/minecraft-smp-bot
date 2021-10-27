const mineflayer = require('mineflayer');
const armorManager = require('mineflayer-armor-manager')
const autoeat = require("mineflayer-auto-eat")
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalNear } = require('mineflayer-pathfinder').goals
const blockFinderPlugin = require('mineflayer-blockfinder')(mineflayer);
const collectBlock = require('mineflayer-collectblock').plugin
const inventoryViewer = require('mineflayer-web-inventory')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const pvp = require('mineflayer-pvp').plugin
const v = require('vec3');
require('dotenv').config();

// Define Bot
const bot = mineflayer.createBot({host: process.env.host, username: `${process.env.clan}_2`, version: "1.17.1"})
bot.loadPlugin(blockFinderPlugin);
bot.loadPlugin(inventoryViewer)
bot.loadPlugin(autoeat);
bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)
bot.loadPlugin(armorManager);
bot.loadPlugin(pvp)

// On Spawn Event
let mcData, defaultMove
bot.once("spawn", () => {
    mineflayerViewer(bot, { port: 3000, firstPerson : true})
    mcData = require('minecraft-data')(bot.version)
    defaultMove = new Movements(bot, mcData)
    bot.autoEat.options = {priority: "foodPoints", startAt: 14, bannedFood: [],}
    setTimeout(() => bot.chat("/login slave_2"), 5000)
    // setTimeout(() => bot.chat(`/ptp ${process.env.name}`), 7500)

})

// Monitor Health Event
bot.on("health", () => {
    if (bot.food === 20) bot.autoEat.disable()
    // Disable the plugin if the bot is at 20 food points
    else bot.autoEat.enable() // Else enable the plugin again
})

// Check for new enemies to attack
bot.on('physicTick', async () => {
    // Only look for mobs within 10 Blocks
    const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 6 && e.mobType !== 'Armor Stand'
    entity = bot.nearestEntity(filter)
     if (entity){
        bot.pvp.attack(entity)
    }

})

// Equip Best Armor Each Time New Item Is Picked Up
bot.on("playerCollect", () => {bot.armorManager.equipAll()})

// On Chat Event
bot.on('chat', async function onChat (username, message) {
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
                bot.pathfinder.goto(new GoalNear(position.x, position.y, position.z, 1))
            }
        }

        // Command To Have Bot Stop Moving
        else if (command === 'stop') {bot.pathfinder.setGoal(null)}

        // Command To Have Bot Sleep In Nearest Bed
        else if (command === "sleep") {
            const bed = bot.findBlocks({matching: block => bot.isABed(block)})
            if (!bed.length){
                bot.chat(' /pchat No Nearby Beds')
            } else {
                    // Go To Bed If Not Already There
                    bot.pathfinder.setMovements(defaultMove)
                    bot.pathfinder.goto(new GoalNear(bed[0].x, bed[0].y, bed[0].z, 1))
                    await bot.sleep(bot.blockAt(bed[0]))
                        .then(() => {bot.chat(' /pchat sleeping')})
                        .catch(error => {bot.chat(` /pchat I can't sleep: ${error}`)})
            }
        }

        else if (command.startsWith("collect")){
            const args = command.split(" ")
            if (args === 1) {bot.chat(' /pchat invalid params')}

            const blockType = mcData.blocksByName[args[1]]
            if (!blockType){bot.chat(` /pchat Invalid block "${args[1]}" not found`)
                return;
            }

            const blocks = bot.findBlockSync({point: bot.entity.position, matching: blockType.id, maxDistance: 256, count: args[2]})
            if (!blocks.length){
                bot.chat('/pchat I dont see that block nearby')
                return;
            }

            const targets = []
            for (let i = 0; i < Math.min(blocks.length, args[2]); i++) {
                targets.push(bot.blockAt(blocks[i].position))
            }
            bot.chat(`/pchat Found ${targets.length} ${args[1]}`)

            bot.collectBlock.collect(targets, err => {
                if (err) {
                    // Log Error
                    bot.chat(` /pchat ${err.message}`)
                } else {
                    // Collected All Blocks
                    bot.chat(` /pchat Collected ${args[2]} ${args[1]}`)
                }
            })
        }

        else if (command === 'unload'){
            // Define Chest Location And Items
            const unloadChest = v(process.env.unloadchestx, process.env.unloadchesty, process.env.unloadchestz)
            const inventoryItems = bot.inventory.items();

            // Go To Chest If Not Already There
            bot.pathfinder.setMovements(defaultMove)
            await bot.pathfinder.goto(new GoalNear(unloadChest.x, unloadChest.y, unloadChest.z, 1))

            bot.openChest(bot.blockAt(unloadChest)).then(async chest => {
                // Put Every Item In Unload Chest
                for (const item of inventoryItems) {
                    if (!item || !item.type) continue;
                    await chest.deposit(item.type, item.metadata, item.count).catch(async error => {
                        if (error.message === "destination full") {bot.chat(` /pchat error depositing ${item.name} x${item.count}`)}
                    })
                }
                await chest.close()
                bot.chat(' /pchat Finished unloading')
            })


        }
    }
});
