const { TBSAdapter, TBSService, RequestScanReceiver } = require('./TBS');
const FfmpegCommand = require('fluent-ffmpeg');

const config = require('./config')

class App {
  #tbsAdapter;
  #tbsService;
  #ffmpeg;

  #availableFrequencies;

  constructor() {
    this.#ffmpeg = new FfmpegCommand('/dev/video0');
    // this.#tbsAdapter = new TBSAdapter({
    //   address: config.tbsFussion.deviceAddress,
    //   baudRate: config.tbsFussion.deviceBaudRate,
    //   port: config.tbsFussion.devicePath,
    //   rejectTimeoutInMs: 50000,
    //   logging: false,
    // });
    // this.#tbsService = new TBSService(this.#tbsAdapter);

    this.#availableFrequencies = this.#getAvailableFrequencies();
  }

  main = async () => {
    this.#recordVideo()
    // this.#scan()
  };

  #scan = async () => {
    try {
      const scannedFrequencies = await this.#scanFrequencies();
      const bestFrequency = await this.#getBestFrequency(scannedFrequencies);
        
      if (bestFrequency) {
        await this.#tbsService.setFrequency(bestFrequency.frequency);
        console.log('Best frequency:', bestFrequency.frequency, 'setled');
        this.#recordVideo()
        
      } else {
        console.log('No best frequency found');
        this.#scan()
      }
    } catch (error) {
      console.error(error);
    }
  }

  #recordVideo = () => {
    this.#ffmpeg.videoBitrate(1024)
    // set target codec
    // .videoCodec('divx')
    // set aspect ratio
    .aspect('16:9')
    // set size in percent
    .size('50%')
    // set fps
    .fps(24)
    // set audio bitrate
    // .audioBitrate('128k')
    // set audio codec
    // .audioCodec('libmp3lame')
    // set number of audio channels
    .audioChannels(2)
    // set custom option
    // .addOption('-vtag', 'DIVX')
    // set output format to force
    .format('avi')
    // setup event handlers
    .on('end', function() {
      console.log('file has been converted succesfully');
    })
    .on('error', function(err) {
      console.log('an error happened: ' + err.message);
    })
    // save to file
    .save('camera-recording.avi');
  }

  #getAvailableFrequencies = () => {
    const frequencyAmount = Math.abs(config.scan.frequencyRange.start - config.scan.frequencyRange.end) / config.scan.frequencyStep;
    const frequenciesToScan = new Array(frequencyAmount)
      .fill(0)
      .map((_, i) => config.scan.frequencyRange.start + i * config.scan.frequencyStep);
    const chunkedFrequencies = []

    for (let i = 0; i < frequenciesToScan.length; i += config.scan.frequenciesPerRequest) {
      chunkedFrequencies.push(frequenciesToScan.slice(i, i + config.scan.frequenciesPerRequest));
    }

    return chunkedFrequencies
  };

  #scanFrequencies = async () => {
    const responses = await Promise.all(this.#availableFrequencies.map((chunk) => this.#tbsService.scanFrequencies({
      receiver: RequestScanReceiver.ab,
      frequencyChangeDelayInMs: 40,
      frequencies: chunk
    })))

    return responses.flat(Infinity);
  };

  #getBestFrequency = async (frequencies) => {
    const sortedFrequencies = frequencies
      .filter((frequency) => frequency.rssi > 50)
      .sort((a, b) => b.rssi - a.rssi);

    return sortedFrequencies.length > 0 ? sortedFrequencies[0] : null;
  };
}

module.exports = { App };