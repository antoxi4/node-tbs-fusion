const http = require('http')
const fs = require('fs');
const path = require('path');
const FfmpegCommand = require('fluent-ffmpeg');

class StreamService {
  httpServer
  ffmpegStream

  constructor() {
    this.httpServer = http.createServer(this.requestHandler)
    this.httpServer.listen(3002)
    this.httpServer.on('listening', () => {
      console.info('Server start at: ', 3002)
    })

    this.ffmpegStream = FfmpegCommand('/dev/video0') // See above article
    // Set input format (depends on OS, will not work if this isn't correct!)
    .inputFormat('mjpeg')
    // Set output format
    // .format('mp4')
    // Set size
    .size('1280x720')
    // Set FPS
    .fps(25)
    // Set video codec
    // .videoCodec('v4l2')
    .outputOptions(['-f v4l2'])
    // Record stream for 15sec
    // .duration('0:40')
    .save('stream.mkv');
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
    // if (err) {
    //   console.error(err);
    //   res.writeHead(404, {'Content-Type': 'text/plain'});
    //   res.end('File not found');
    //   return;
    // }

    const range = req.headers.range;

    console.log('range', range);
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

    

    this.ffmpegStream.pipe(res);
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