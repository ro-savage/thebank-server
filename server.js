// Require the framework and instantiate it
const fastify = require('fastify')({
  logger: true
})

fastify.register(require('fastify-cors'))

// const sqlite = require('sqlite')
// const dbPromise = sqlite.open('./navcoin.sqlite', { Promise });
// let db

const axios = require("axios");
const NavCoin = require('./navcoind');
const db = require('./db-read');
const navcoind = new NavCoin({ rpcuser: 'test', rpcpassword: 'test' })

// Declare a route
fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

fastify.get('/getinfo', async (request, reply) => {
  const walletInfo = await navcoind.request('getinfo')
  return walletInfo
})

fastify.get('/getbalance', async (request, reply) => {
  const walletInfo = await navcoind.getBalance()
  return walletInfo
})

fastify.get('/getblocks', async (request, reply) => {
  const blocks = await db.readBlocks()
  return blocks
})

fastify.get('/getblock/:id', async (req, reply) => {
  const blockId = req.params.id
  if (isNaN(blockId)) { // is a hash
    return await db.readBlockWhereHash(blockId)
  }

  if (!isNaN(blockId)) { // is a block height
    return await db.readBlockWhereHeight(parseInt(blockId))
  }

  return {}
})

fastify.get('/gettransactions', async (request, reply) => {
  const transactions = await db.readAllTransactions()
  return transactions
})

// Run the server!
const start = async () => {
  try {
    await fastify.listen(3000)
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    db.closeDB()
    fastify.log.error(err)
    process.exit(1)
  }
}
start()