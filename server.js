const request = require('request')
const express = require('express')

const app = express()

app.listen(process.env.PORT || 5050, () => {
    console.log('Listening on port 5050 ...')
})

let start = new Date().getTime()

console.log('Start: '+start)

app.get('/', async function(req, res) {
    res.writeHeader(200, {"Content-Type": "text/html"})
    res.write(''+start)
    res.end()
})
