const SteamUser = require('steam-user')
const SteamCommunity = require('steamcommunity')
const SteamTotp = require('steam-totp')
const TradeOfferManager = require('steam-tradeoffer-manager')
const fs = require('fs-extra')

const config = require('./config')

const client = new SteamUser({
  autoRelogin: true,
  promptSteamGuardCode: false
})

const community = new SteamCommunity()

const manager = new TradeOfferManager({
  steam: client,
  community: community,
  language: 'en' // omit if ram usage is high
})

if (fs.existsSync('polldata.json')) {
  manager.pollData = fs.readJsonSync('polldata.json')
}

manager.on('pollData', async pollData => {
  try {
    await fs.writeJson('polldata.json', pollData)
  } catch (error) {
    console.error('Error while writing to polldata.json.', error)
  }
})

client.logOn({
  accountName: config.username,
  password: config.password
})

client.on('loggedOn', () => {
  console.log(`Logged into Steam as #${client.steamID.getSteamID64()}`)
})

client.on('steamGuard', (domain, callback, lastCodeWrong) => {
  console.log('## SteamGuard event!')

  if (domain) {
    console.log('Account is using email SteamGuard, I have not implented a solution for that, so I will exit to prevent any bootloops.')
    return process.exit(1)
  }

  if (lastCodeWrong) {
    console.log('Last code was wrong, will exit to prevent bootloops in case of any problems.')
    return process.exit(1)
  }

  const twoFactorCode = SteamTotp.getAuthCode(config.shared_secret)

  console.log(`Will try to login again with "${twoFactorCode}" as SteamGuard code!`)

  callback(twoFactorCode)
})

client.on('webSession', (sessionID, cookies) => {
  manager.setCookies(cookies, error => {
    if (error) {
      console.log(error)
      process.exit(1) // Fatal error since we couldn't get our API key
    }

    console.log('Got API key: ' + manager.apiKey)
  })

  community.setCookies(cookies)
})
