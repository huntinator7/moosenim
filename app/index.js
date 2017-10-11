const http = require('http')
const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello from Express')
})

app.listen(port, (err) => {
    if (err) {
        return console.log('Error', err)
    }
    console.log(`Server is listening on ${port}`)
})