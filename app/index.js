const http = require('http')
const port = 3000

const requestHandler = (req, res) => {
    console.log(req.url)
    res.end('Hello Node.js server')
}

const server = http.createServer(requestHandler).listen(port, (err) => {
    if (err) {
        return console.log('Error in listen', err)
    }
    console.log(`Server is listening on port ${port}`)
})