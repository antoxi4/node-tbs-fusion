const { TBSAdapter, TBSService, RequestScanReceiver } = require('./TBS');

const RS485Path = '/dev/serial0';
const RS485BaudRate = 9600;
const TBSFussionAdress = 1;

class App {
  #tbsAdapter;
  #tbsService;

  #amountScanFrequencyPerRequest = 40;
  #frequencyStep = 10;
  #frequencyRange = [4900, 6200];
  #availableFrequencies;

  constructor() {
    this.#tbsAdapter = new TBSAdapter({
      address: TBSFussionAdress,
      baudRate: RS485BaudRate,
      port: RS485Path,
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
        await this.#tbsService.setFrequency(bestFrequency.frequency);
        console.log('Best frequency:', bestFrequency.frequency, 'setled');
      } else {
        console.log('No best frequency found');
        this.#scan()
      }
    } catch (error) {
      console.error(error);
    }
  }

  #getAvailableFrequencies = () => {
    const [startFrequency, endFrequency] = this.#frequencyRange;
    const frequencyAmount = Math.abs(startFrequency - endFrequency) / this.#frequencyStep;
    const frequenciesToScan = new Array(frequencyAmount)
      .fill(0)
      .map((_, i) => startFrequency + i * this.#frequencyStep);
    const chunkedFrequencies = []

    for (let i = 0; i < frequenciesToScan.length; i += this.#amountScanFrequencyPerRequest) {
      chunkedFrequencies.push(frequenciesToScan.slice(i, i + this.#amountScanFrequencyPerRequest));
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