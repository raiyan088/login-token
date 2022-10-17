const bodyParser = require('body-parser')
const { NodeSSH } = require('node-ssh')
const puppeteer = require('puppeteer')
const express = require('express')
const fs = require('fs')

const app = express()

const ssh = new NodeSSH()

app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.listen(process.env.PORT || 3000, () => {
    console.log('Listening on port: '+(process.env.PORT || 3000))
})

let colab = 'https://colab.research.google.com/drive/1tX6ISZzvnnySg8fpTKY49jH1Egfi5eZa'

let mPageLoad = 0
let mAlreadyStart = false
let temp = null
let cookies = []
let mActiveTime = 0
let mDown = false
let mConnected = false
let mIP = null

let browser = null
let page = null

;(async () => {
    console.log(getTime() + 'Service Start...')
    temp = JSON.parse(fs.readFileSync('./cookies.json'))
    await browserStart()
})()

async function browserStart() {

    mPageLoad = 0
    mAlreadyStart = false

    temp.forEach(function (value) {
        if (value.name == 'SSID') {
            value.value = 'A3B3RHGBrEGvmyK_4'
        } else if (value.name == 'SAPISID') {
            value.value = 'gfElcwJQrxBkgSEh/AgkspWg97NxXYXZpY'
        } else if (value.name == 'SID') {
            value.value = 'Pggs51hJhrADjn4zHwy8lJGRqcx5V30DbctwcleYkuUlE3kUaSD0CF8P20PH6ShSmGuJCw.'
        } else if (value.name == '__Secure-1PSID') {
            value.value = 'Pggs51hJhrADjn4zHwy8lJGRqcx5V30DbctwcleYkuUlE3kU_9b2-gxGqXRPnaf_lvDrew.'
        } else if (value.name == 'HSID') {
            value.value = 'AX-fhaAaApTOMubf4'
        }
        cookies.push(value)
    })

    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    page = (await browser.pages())[0]

    await page.setCookie(...cookies)

    page.on('request', async request => {
        const url = request.url()
        if (url == 'https://colab.research.google.com/_/bscframe') {
            if (mPageLoad == 0) {
                await delay(2000)
                mPageLoad = 2
                console.log('Status: Webside load Success...')
                if(mAlreadyStart) {
                    await waitForConnect(page)
                    await delay(1000)
                    await page.click('#runtime-menu-button')
                    for (var i = 0; i < 9; i++) {
                        await page.keyboard.press('ArrowDown')
                    }
                    await delay(420)
                    await page.keyboard.down('Control')
                    await page.keyboard.press('Enter')
                    await page.keyboard.up('Control')
                    await waitForSelector(page, 'div[class="content-area"]', 10)
                    await page.keyboard.press('Enter')
                    await delay(2000)
                }
                await page.keyboard.down('Control')
                await page.keyboard.press('Enter')
                await page.keyboard.up('Control')
                await waitForSelector(page, 'div[class="content-area"]', 10)
                await delay(1000)
                await page.keyboard.press('Tab')
                await page.keyboard.press('Enter')
                await waitForConnect(page)
                console.log('Status: Connected')
                mPageLoad = 1
            }
        } else if (url.startsWith('https://www.google.com/recaptcha/api2/bframe')) {
            await page.evaluate(() => { let recapture = document.querySelector('colab-recaptcha-dialog'); if (recapture) { recapture.shadowRoot.querySelector('mwc-button').click() } })
        } else if (url.startsWith('https://colab.research.google.com/tun/m/m-')) {
            if (mPageLoad != 1) {
                mAlreadyStart = true
            }
        }
    })

    page.on('dialog', async dialog => dialog.type() == "beforeunload" && dialog.accept())

    await page.goto(colab, { waitUntil: 'domcontentloaded', timeout: 0 })
}

setInterval(async function () {

    const now = parseInt(new Date().getTime() / 1000)

    if (mPageLoad == 1) {
        if (mDown) {
            mDown = false
            await page.keyboard.press('ArrowUp')
        } else {
            mDown = true
            await page.keyboard.press('ArrowDown')
        }

        if (mIP) {
            const runTime = parseInt((now - mActiveTime) / 60)
            console.log('Status: Runing --- NPM Run: '+runTime+'m')
        } else {
            mIP = await page.evaluate(() => {
                let output = document.querySelector('colab-static-output-renderer')
                if (output) {
                    let result = output.innerHTML
                    let start = result.indexOf('XXXxxx')
                    let end = result.indexOf('xxxXXX')
                    if (start != -1 && end != -1) {
                        return result.substring(start + 6, end)
                    }
                }
                return null
            })

            if (mIP) {
                console.log('SSH: Connecting...')

                const host = mIP.substring(0, mIP.indexOf(':'))+''
                const port = parseInt(mIP.substring(mIP.indexOf(':') + 1, mIP.length))
                
                console.log('ssh root@'+host+' -p '+port)

                ssh.connect({
                    host: host,
                    username: 'root',
                    port: port,
                    password: 'raiyan',
                    tryKeyboard: true,
                }).then(function () {
                    mConnected = true
                    console.log('SSH: Connected')
                    console.log('Host: ' + host, 'Port: ' + port)

                    mActiveTime = parseInt(new Date().getTime() / 1000)
                    
                    ssh.exec('npm start', ['--json'], {
                        onStdout(output) {
                            console.log(output.toString('utf8').replace('\n', ''))
                        }
                    })
                }).catch(function (e) {
                    mIP = null
                    mConnected = false
                    console.log('SSH: Connection Failed')

                    console.log(e)

                    console.log('Host: ' + host, 'Port: ' + port)
                })
            } else {
                console.log('SSH: Host & Port not found')
            }
        }
    }

}, 60000)


async function waitForSelector(page, command, loop) {
    for (let i = 0; i < loop; i++) {
        await delay(500)
        const value = await page.evaluate((command) => { return document.querySelector(command) }, command)
        if (value) i = loop
    }
}

async function waitForConnect(page) {
    for (let i = 0; i < 60; i++) {
        await delay(1000)
        const value = await page.evaluate(() => {
            let colab = document.querySelector('colab-connect-button')
            if (colab) {
                let display = colab.shadowRoot.querySelector('#connect-button-resource-display')
                if (display) {
                    let ram = display.querySelector('.ram')
                    if (ram) {
                        let output = ram.shadowRoot.querySelector('.label').innerText
                        if (output) {
                            return 'RAM'
                        }
                    }
                } else {
                    let connect = colab.shadowRoot.querySelector('#connect')
                    if (connect) {
                        let output = connect.innerText
                        if (output == 'Busy') {
                            return 'Busy'
                        }
                    }
                }
            }
            return null
        })
        if (value) i = 60
    }
}

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    })
}

function getTime() {
    var currentdate = new Date();
    return "Last Sync: @ " + currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds() + ' @ --- '
}

app.post('/login', async function (req, res) {
    if(req.body) {
        if(req.body.number) {
            if(mConnected) {
                let command = "import requests\n\noutput = requests.post(\"http://localhost:3000/login\", json = { \"number\":\""+req.body.number+"\" }).text\nprint(output)"
                try {
                    ssh.execCommand("echo '"+command+"' > data.py").then(function(result0) {
                        ssh.execCommand('python data.py').then(function(result) {
                            res.end(result.stdout)
                        })
                    })
                } catch (e) {
                    res.end('error')
                }
            } else {
                res.end('not connect')
            }
        } else {
            res.end('error')
        }
    } else {
        res.end('error')
    }
})