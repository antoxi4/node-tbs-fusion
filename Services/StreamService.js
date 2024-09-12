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

  streamVideo = async (req, res) => {
    if (err) {
      console.error(err);
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('File not found');
      return;
    }

    // const range = req.headers.range;
    // const fileSize = stats.size;
    // const chunkSize = 1024 * 1024;
    // const start = Number(range.replace(/\D/g, ""));
    // const end = Math.min(start + chunkSize, fileSize - 1);

    const headers = {
      "Content-Type": "video/mp4",
      // "Content-Length": end - start,
      // "Content-Range": "bytes " + start + "-" + end + "/" + fileSize,
      // "Accept-Ranges": "bytes",
    };

    res.writeHead(206, headers);

    // const fileStream = fs.createReadStream(filePath, { start, end });

    const ffmpegStream = ffmpeg('video0')
      .noAudio()
      .videoCodec('libx264')
      .format('mp4')
      .outputOptions('-movflags frag_keyframe+empty_moov')
      .on('end', () => {
        console.log('Streaming finished');
      })
      .on('error', (err) => {
        console.error(err);
      });

    ffmpegStream.pipe(res);
    // res.writeHead(404, { 'Content-Type': 'text/plain' });
    // res.end('Not found');
  }

  videoPage = async (req, res) => {
    const html = fs.readFileSync(path.resolve(__dirname, 'stream.html'), 'utf8');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(html);
    res.end();
  }
}

module.exports = { StreamService };