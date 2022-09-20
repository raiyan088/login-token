const request = require('request')
const express = require('express')

let puppeteer = null
let chrome = {}

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    chrome = require("chrome-aws-lambda")
    puppeteer = require("puppeteer-core")
} else {
    puppeteer = require("puppeteer")
}

const app = express()

app.listen(process.env.PORT || 3000, () => {
    console.log('Listening on port 3000 ...')
})

let mOpenTerminal = false
let browser = null
let page = null
let options = {}

console.log('Start: '+new Date().getTime())

//startBackgroundService()

async function startBackgroundService() {
    ;(async () => {
        if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
            options = {
              args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
              defaultViewport: chrome.defaultViewport,
              executablePath: await chrome.executablePath,
              headless: true,
              ignoreHTTPSErrors: true,
            }
        } else {
            options = {
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        }
        browser = await puppeteer.launch(options)
    
        page = (await browser.pages())[0]
    
        page.on('request', async request => {
            const url = request.url()
            //console.log(url)
            if((url.includes('kernelspecs?') || url.includes('api/terminals?') || url.includes('api/contents?')) && !mOpenTerminal) {
                let click = await page.evaluate(() => {
                    let root = document.querySelector('div[title="Start a new terminal session"]')
                    if(root) {
                        root.click()
                        return true
                    }
                    return false
                })

                if(click && !mOpenTerminal) {
                    mOpenTerminal = true
                    console.log('Success')
                    await waitForSelector(page, 'canvas[class="xterm-cursor-layer"]')
                    await delay(420)
                    await page.keyboard.type('lscpu')
                    console.log('Type')
                    await delay(420)
                    await page.keyboard.press('Enter')

                    console.log('End: '+new Date().getTime())
                }
            }
        })
    
        page.on('dialog', async dialog => dialog.type() == "beforeunload" && dialog.accept())
    
        await page.goto('https://mybinder.org/v2/git/https%3A%2F%2Fgithub.com%2Faanksatriani%2Fmybinder.git/main', { waitUntil: 'domcontentloaded', timeout: 0 })
    })()
}

app.get('/page', async function(req, res) {
    if(page == null) {
        res.writeHeader(400, {"Content-Type": "text/html"})
        res.write('Error')
        res.end()
    } else {
        try {
            await page.screenshot({ path: './image.png' })
            fs.readFile('./image.png', function (err, data) {
                if (err) {
                    res.writeHeader(400, {"Content-Type": "text/html"})
                    res.write('Error: '+err)
                    res.end()
                }else {
                    res.writeHeader(200, {"Content-Type": "image/png"})
                    res.write(data)
                    res.end()
                }
            })
        } catch(e) {
            res.writeHeader(400, {"Content-Type": "text/html"})
            res.write('Error: '+e)
            res.end()
        }
    }
})

app.get('/data', async function(req, res) {
    res.writeHeader(200, {"Content-Type": "text/html"})
    res.write(JSON.stringify(options))
    res.end()
})

app.get('/check', async function(req, res) {
    res.writeHeader(200, {"Content-Type": "text/html"})
    res.write(''+process.env.AWS_LAMBDA_FUNCTION_VERSION)
    res.end()
})

app.get('/start', async function(req, res) {
    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        options = {
          args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
          defaultViewport: chrome.defaultViewport,
          executablePath: await chrome.executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
        }
    } else {
        options = {
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    }
    browser = await puppeteer.launch(options)

    page = (await browser.pages())[0]

    page.on('request', async request => {
        const url = request.url()
        //console.log(url)
        if((url.includes('kernelspecs?') || url.includes('api/terminals?') || url.includes('api/contents?')) && !mOpenTerminal) {
            let click = await page.evaluate(() => {
                let root = document.querySelector('div[title="Start a new terminal session"]')
                if(root) {
                    root.click()
                    return true
                }
                return false
            })

            if(click && !mOpenTerminal) {
                mOpenTerminal = true
                console.log('Success')
                await waitForSelector(page, 'canvas[class="xterm-cursor-layer"]')
                await delay(420)
                await page.keyboard.type('lscpu')
                console.log('Type')
                await delay(420)
                await page.keyboard.press('Enter')

                console.log('End: '+new Date().getTime())
            }
        }
    })

    page.on('dialog', async dialog => dialog.type() == "beforeunload" && dialog.accept())

    await page.goto('https://mybinder.org/v2/git/https%3A%2F%2Fgithub.com%2Faanksatriani%2Fmybinder.git/main', { waitUntil: 'domcontentloaded', timeout: 0 })
    res.writeHeader(200, {"Content-Type": "text/html"})
    res.write(JSON.stringify(options))
    res.end()
})

async function waitForSelector(page, command) {
    for (let i = 0; i < 10; i++) {
        await delay(1000)
        const value = await page.evaluate((command) => { return document.querySelector(command) }, command)
        if (value) i = 10
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

function getUpdate(size) {
    let zero = ''
    let loop = size.toString().length
    for (let i = 0; i < 3 - loop; i++) {
        zero += '0'
    }
    return 'mining-' + zero + size
}
