const http = require('http')
const fs = require('fs');
const path = require('path');
const FfmpegCommand = require('fluent-ffmpeg');

class StreamService {
  httpServer

  constructor() {
    this.httpServer = http.createServer(this.requestHandler)
    this.httpServer.listen(3002)
    this.httpServer.on('listening', () => {
      console.info('Server start at: ', 3002)
    })
  }

  requestHandler = (req, res) => {

    switch (req.url) {
      case '/':
        this.videoPage(req, res);
        break;
      case '/video':
        this.streamVideo(req, res);
        break;
      default:
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        break;
    }
  }

  streamVideo = (req, res) => {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }

  videoPage = (req, res) => {
    const html = fs.readFileSync(path.resolve(__dirname, 'stream.html'), 'utf8');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(html);
    res.end();
  }
}

module.exports = { StreamService };