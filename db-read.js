const sqlite = require('sqlite')
const SQL = require('sql-template-strings')
SQL.SQLStatement.prototype.appendWhereIn = function (column, array) {
  this.append(` WHERE ${column} IN (`);
  array.forEach((item, i) => {
    this.append(SQL`${item}`)
    if (i < array.length - 1) { this.append(',') }
  })
  this.append(`)`)

  return this
}

const dbPromise = sqlite.open('./navcoin.sqlite', { Promise });

const database = {
  dbOpen: false,
  db: {},
  openDB: async function () {
    return new Promise(async (resolve) => {
      if (!this.dbOpen) {
        this.db = await dbPromise
        this.dbOpen = true
      }
      resolve()
    })
  },
  closeDB: async function () {
    return new Promise(async (resolve) => {
      if (this.dbOpen) {
        this.db.close()
        this.dbOpen = false
      }
      resolve()
    })
  },
  readBlocks: async function () {
    return new Promise(async (resolve) => {
      await this.openDB()
      const blocks = await this.db.all(SQL`SELECT * FROM blocks ORDER BY blockHeight DESC LIMIT 5`)
      const blocksAsPureJSON = blocks.map(block => ({ ...block, blockInfo: JSON.parse(block.blockInfo) }))
      resolve(blocksAsPureJSON)
    })
  },
  readBlockWhereId: async function (id, type = 'blockHeight') {
    return new Promise(async (resolve) => {
      await this.openDB()
      let blockArr = []

      if (type === 'blockHeight') {
        blockArr = await this.db.all(SQL`SELECT * FROM blocks WHERE blockHeight = ${id}`)
      }

      if (type === 'blockHash') {
        blockArr = await this.db.all(SQL`SELECT * FROM blocks WHERE blockHash = ${id}`)
      }

      const blockInfo = JSON.parse(blockArr[0].blockInfo)
      const transactions = await this.readTransactions(blockInfo.tx)
      const block = { ...blockArr[0], blockInfo, transactions }
      resolve(block)
    })
  },
  readBlockWhereHeight: function (height) { return this.readBlockWhereId(height, 'blockHeight') },
  readBlockWhereHash: function (hash) { return this.readBlockWhereId(hash, 'blockHash') },
  readAllTransactions: async function () {
    await this.openDB()
    return await this.db.all(SQL`SELECT * FROM transactions`)
  },
  readTransactions: async function (transactionsIds) {
    return new Promise(async (resolve) => {
      await this.openDB()
      const query = SQL`SELECT * FROM transactions`
      query.appendWhereIn('txHash', transactionsIds)
      const transactions = await this.db.all(query)
      const transactionsAsPureJSON = transactions.map(transaction => ({ ...transaction, txInfo: JSON.parse(transaction.txInfo) }))
      resolve(transactionsAsPureJSON)
    })
  }
}

module.exports = database