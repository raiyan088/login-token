const express = require('express')
const request = require('request')

const app = express()

app.listen(process.env.PORT || 3000, () => {
    console.log('Listening on port 3000 ...')
})

let puppeteer = null
let chrome = {}

let mOpenTerminal = false
let browser = null
let page = null
let options = {}

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    chrome = require("chrome-aws-lambda")
    puppeteer = require("puppeteer-core")
} else {
    puppeteer = require("puppeteer")
}

app.get("/check", async (req, res) => {
  options = {}

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    }
  }

  try {
    browser = await puppeteer.launch(options)

    page = await browser.newPage()
    await page.goto("https://www.google.com")
    res.send(await page.title())
  } catch (err) {
    res.send(err)
  }
})

module.exports = app
