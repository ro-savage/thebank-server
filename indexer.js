const sqlite = require('sqlite')
const SQL = require('sql-template-strings')
const NavCoin = require('./navcoind');
const navcoind = new NavCoin({ rpcuser: 'test', rpcpassword: 'test' })


const dbPromise = sqlite.open('./navcoin.sqlite', { Promise });

async function createtables(db) {
  return new Promise(async (resolve) => {
    await db.run(`DROP TABLE IF EXISTS blocks`)
    await db.run(`DROP TABLE IF EXISTS transactions`)
    await db.run(`DROP TABLE IF EXISTS addresses`)

    await db.run(`CREATE TABLE IF NOT EXISTS blocks(
      blockHash text PRIMARY KEY,
      blockHeight int,
      blockInfo text
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS transactions(
      txHash text PRIMARY KEY,
      blockHash text,
      blockHeight int,
      txInfo text
    )`);
    await db.run(`CREATE TABLE IF NOT EXISTS addresses(
      address text PRIMARY KEY,
      balance text,
      transactions text
    )`);

    resolve()
  })
}

async function getBlockInfo(blockHeight, db) {
  return new Promise(async (resolve, reject) => {
    try {
      const blockHash = await navcoind.request('getblockhash', [blockHeight])
      const blockInfo = await navcoind.request('getblock', [blockHash])
      resolve({ blockHeight, blockHash, blockInfo })
    } catch (err) {
      console.log(err)
      reject()
    }
  });
}

async function writeblock(blockHeight, db) {
  return new Promise(async (resolve, reject) => {
    try {
      const blockData = await getConsolidatedBlockData(blockHeight)

      const writeBlockTable = await db.run(SQL`
        INSERT INTO
        blocks(blockHash, blockHeight, blockInfo)
        VALUES(${blockData.block.blockHash}, ${blockData.block.blockHeight}, ${JSON.stringify(blockData.block.blockInfo)})
      `)

      for (const transaction of blockData.transactions) {
        const writeTransactionTable = await db.run(SQL`
          INSERT INTO
          transactions(txHash, blockHash, blockHeight, txInfo)
          VALUES(${transaction.txid}, ${blockData.block.blockHash}, ${blockData.block.blockHeight}, ${JSON.stringify(transaction)})
        `)
      }

      resolve()
    } catch (err) {
      console.log(err)
      reject()
    }
  });
}

async function readBlocks(db) {
  return await db.all(SQL`SELECT blockHeight, blockHash FROM blocks`)
}

async function readTransactions(db) {
  return await db.all(SQL`SELECT txHash FROM transactions`)
}

async function writeblocks(db) {
  return new Promise(async (resolve) => {
    let start = 10000
    const total = 100
    const lengthPerRequest = 10
    let blocks = []
    let promises = []

    for (let i = 0; i < total; i += lengthPerRequest) {
      blocks = Array.from({ length: lengthPerRequest }, (v, k) => k + start + i);
      console.log('Adding blocks', blocks)
      promises = blocks.map(block => writeblock(block, db))
      await Promise.all(promises)
    }

    // const blocks = Array.from({ length: 60 }, (v, k) => k + 10000);
    // for (const blockheight of blocks) {
    //   await writeblock(blockheight, db)
    // }
    // const promises = blocks.map(block => writeblock(block, db))
    // for (i = 0; i < promises.length; i + 10) {
    //   await Promise.all(promises.slice[i, i + 10])
    // }
    resolve()
  })
}

async function getConsolidatedBlockData(blockHeight) {
  return new Promise(async (resolve, reject) => {
    try {
      const blockHash = await navcoind.request('getblockhash', [blockHeight])
      const blockInfo = await navcoind.request('getblock', [blockHash])
      const transactionsHashs = blockInfo.tx
      const transactions = []
      let txid
      let rawtx

      for (let i = 0; i < transactionsHashs.length; i++) {
        txid = transactionsHashs[i]
        rawtx = await navcoind.request('getrawtransaction', [txid])
        tx = await navcoind.request('decoderawtransaction', [rawtx])

        tx.vin.map(async vin => {
          if (vin.txid) {
            const vinRawTx = await navcoind.request('getrawtransaction', [vin.txid])
            const vinTX = await navcoind.request('decoderawtransaction', [vinRawTx])
            vinTX.vout.forEach(vout => {
              if (vout.n === vin.vout) {
                // console.log('Found vout', vout)
                vin.voutTransaction = vout
              }
            })
          }
          return vin
        })
        transactions.push(tx)
      }

      const data = {
        block: { blockHeight, blockHash, blockInfo },
        transactions,
      }

      resolve(data)
    } catch (err) {
      console.log(err)
      reject()
    }
  });
}

async function start() {
  const db = await dbPromise;
  console.log('Started')
  console.time('writingdata');
  await createtables(db)
  await writeblocks(db)
  console.log('Finished')
  console.timeEnd('writingdata');
  // const blocks = await readBlocks(db)
  // const transactions = await readTransactions(db)
  // console.log('******************')
  // console.log('*** READING DB ***')
  // console.log('******************')
  // console.log('blocks', blocks)
  // console.log('transactions', transactions)
  db.close()
}

// createtables()
// writeblocks()
try {
  start()
} catch (err) {
  console.log(err)
}


