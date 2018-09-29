const axios = require("axios");

const NavCoin = function (userconfig = {}) {
  const navcoin = {
    config: {
      rpcuser: 'test123',
      rpcpassword: 'test123',
      url: 'http://localhost',
      port: '44444',
      ...userconfig
    },
    request: async function (method, params = []) {
      const rpcrequest = await axios.post(
        `${this.config.url}:${this.config.port}`,
        { "jsonrpc": "1.0", "id": "navcoind", "method": method, "params": params },
        {
          auth: { username: this.config.rpcuser, password: this.config.rpcpassword },
        })
      return rpcrequest.data.result
    },
    getBalance: async function () {
      return await this.request('getbalance')
    }
  }

  return navcoin
}

module.exports = NavCoin