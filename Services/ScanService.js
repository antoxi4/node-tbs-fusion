
const config = require('../config')
const { TBSAdapter, TBSService, RequestScanReceiver } = require('../TBS');

class ScanService {
  /**
   * @type {(number[])[]>}
   */
  #scaningFrequencies = [];
  /** 
   * TBS Adapter instance
   * @type { TBSAdapter }
   */
  #tbsAdapter;
  /** 
   * TBS Adapter instance
   * @type { TBSService }
   */
  #tbsService;

  constructor() {
    this.#scaningFrequencies = this.#getScanningFrequencies();
    this.#tbsAdapter = new TBSAdapter({
      address: config.tbsFussion.deviceAddress,
      baudRate: config.tbsFussion.deviceBaudRate,
      port: config.tbsFussion.devicePath,
      rejectTimeoutInMs: 50000,
      logging: false,
    });
    this.#tbsService = new TBSService(this.#tbsAdapter);
  }

  setActiveFrequency = async (frequency) => {
    await this.#tbsService.setFrequency(frequency);
  };

  getFrequencyForCapture = async () => {
    const scannedFrequencies = await Promise.all(this.#scaningFrequencies.map((chunk) => this.#tbsService.scanFrequencies({
      receiver: RequestScanReceiver.ab,
      frequencyChangeDelayInMs: 40,
      frequencies: chunk
    })))
    const suitableFrequencies = scannedFrequencies
      .flat(Infinity)
      .filter((frequency) => frequency.rssi > config.scan.minRssiForStartSession)
      .sort((a, b) => b.rssi - a.rssi);
    const bestFrequency = suitableFrequencies.length > 0 ? suitableFrequencies[0] : null;

    return bestFrequency
  };

  getFrequencyRssi = async (frequency) => {
    const scannedFrequencies = await this.#tbsService.scanFrequencies({
      receiver: RequestScanReceiver.ab,
      frequencyChangeDelayInMs: 40,
      frequencies: [frequency]
    })

    return scannedFrequencies[0]
  };

  getActiveFrequency = async () => {
    return this.#tbsService.getCurrentFrequencyRSSI();
  };

  /**
   * @return {(number[])[]>}
   */
  #getScanningFrequencies = () => {
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
}

module.exports = { ScanService };