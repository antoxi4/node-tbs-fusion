const fs = require('fs');
const path = require('path');
const FfmpegCommand = require('fluent-ffmpeg');

const config = require('./config')
const { TBSAdapter, TBSService, RequestScanReceiver } = require('./TBS');

class App {
  #tbsAdapter;
  #tbsService;
  #ffmpeg;

  #availableFrequencies;
  #activeSession;
  #activeSessionCheckInterval;
  #activeSessionRecording;

  constructor() {
    this.#activeSession = null;
    
    this.#tbsAdapter = new TBSAdapter({
      address: config.tbsFussion.deviceAddress,
      baudRate: config.tbsFussion.deviceBaudRate,
      port: config.tbsFussion.devicePath,
      rejectTimeoutInMs: 50000,
      logging: false,
    });
    this.#tbsService = new TBSService(this.#tbsAdapter);

    this.#availableFrequencies = this.#getAvailableFrequencies();
  }

  main = async () => {
    this.#scan()
  };

  #scan = async () => {
    try {
      const scannedFrequencies = await this.#scanFrequencies();
      const bestFrequency = await this.#getBestFrequency(scannedFrequencies);

      if (bestFrequency) {
        this.#startFolowingFrequency(bestFrequency);
      } else {
        console.log('No best frequency found');
        this.#scan()
      }
    } catch (error) {
      console.error(error);
    }
  }

  #startFolowingFrequency = async (bestFrequency) => {
    this.#activeSession = this.#createSession(bestFrequency.frequency);

    await this.#tbsService.setFrequency(bestFrequency.frequency);
    this.#recordVideo(this.#activeSession.videoPath);
    this.#activeSessionCheckInterval = setInterval(this.#checkActiveSessionFrequencyRssi, 2000);

    console.log(`Started Following frequency: ${bestFrequency.frequency} with RSSI: ${bestFrequency.rssi}`);
  }

  #stopFollowingFrequency = async (sessionId) => {
    clearInterval(this.#activeSessionCheckInterval);
    this.#activeSessionCheckInterval = null;

    const data = JSON.parse(fs.readFileSync(path.join(config.output.rootFolder, config.output.dataFile)));
    const session = data.find((session) => session.sessionId === sessionId);

    if (session) {
      session.endTime = Date.now();
      fs.writeFileSync(path.join(config.output.rootFolder, config.output.dataFile), JSON.stringify(data));
    }

    await this.#stopRecording();
    this.#scan();
  }

  #checkActiveSessionFrequencyRssi = async () => {
    const frequency = await this.#tbsService.getCurrentFrequencyRSSI();

    console.log(`Following Frequency: ${frequency.frequency}, RSSI A: ${frequency.rssiA}, RSSI B: ${frequency.rssiB}`);

    if (frequency.rssiA < config.scan.minRssiForStopSession || frequency.rssiB < config.scan.minRssiForStopSession) {
      this.#stopFollowingFrequency(this.#activeSession.sessionId);
    }
  }

  #createSession = (frequency) => {
    const sessionId = Date.now();
    const session = {
      sessionId,
      frequency,
      startTime: sessionId,
      endTime: null,
      videoPath: path.join(config.output.rootFolder, config.output.videoFolder, `${sessionId}.avi`),
    }

    if (!fs.existsSync(path.resolve(config.output.rootFolder))) {
      fs.mkdirSync(path.resolve(config.output.rootFolder));
      fs.mkdirSync(path.join(config.output.rootFolder, config.output.videoFolder));
      fs.writeFileSync(path.join(config.output.rootFolder, config.output.dataFile), JSON.stringify([]));
    }

    const data = JSON.parse(fs.readFileSync(path.join(config.output.rootFolder, config.output.dataFile)));

    data.push(session);

    fs.writeFileSync(path.join(config.output.rootFolder, config.output.dataFile), JSON.stringify(data));

    return session
  }

  #recordVideo = (fileName) => {
    return new Promise((resolve, reject) => {
      this.#ffmpeg = new FfmpegCommand();
      this.#ffmpeg.input(config.video.devicePath)
        .save(fileName)
        .on('start', () => {
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.log('Cannot process video: ' + err.message);
          reject(err);
        });
    });
  }

  #stopRecording = () => {
    return new Promise((resolve, reject) => {
      this.#ffmpeg.on('end', () => {
        console.log('Recording stopped');
        this.#ffmpeg = null;
        resolve();
      })
      this.#ffmpeg.ffmpegProc.stdin.write('q');
    });
  };

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
      .filter((frequency) => frequency.rssi > config.scan.minRssiForStartSession)
      .sort((a, b) => b.rssi - a.rssi);

    return sortedFrequencies.length > 0 ? sortedFrequencies[0] : null;
  };
}

module.exports = { App };