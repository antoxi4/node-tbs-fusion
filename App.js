
const config = require('./config')
const { ScanService } = require('./Services/ScanService');
const { FrequencyRecordService, Record } = require('./Services/FrequencyRecordService');

class App {
  /**
   * @type {Record | null}
   */
  #activeFrequencyRecording;

  /**
   * @type {ScanService}
   */
  #scanService;

  /**
   * @type {FrequencyRecordService}
   */
  #frequencyRecordService;

  #checkActiveRecordFrequencyRssiTimeout;

  constructor() {
    this.#checkActiveRecordFrequencyRssiTimeout = null;
    this.#activeFrequencyRecording = null;
    this.#scanService = new ScanService();
    this.#frequencyRecordService = new FrequencyRecordService();
  }

  main = async () => {
    await this.#scan()
  };

  #scan = async () => {
    try {
      const frequencyForRecording = await this.#scanService.getFrequencyForCapture();

      if (frequencyForRecording) {
        console.log(`Suitable frequency found: ${frequencyForRecording.frequency} with RSSI: ${frequencyForRecording.rssi}`);
        this.#startRecordingFrequency({ frequency: frequencyForRecording.frequency, rssi: frequencyForRecording.rssi });
      } else {
        console.log('No suitable frequency found');
        this.#scan()
      }
    } catch (error) {
      console.error(error);
    }
  }

  #startRecordingFrequency = async ({ frequency, rssi }) => {
    await this.#scanService.setActiveFrequency(frequency);

    this.#activeFrequencyRecording = await this.#frequencyRecordService.startRecord(frequency);

    console.log(`Started recording frequency: ${frequency} with RSSI: ${rssi}`);
    this.#checkActiveRecordFrequencyRssi();
  }

  #startCheckActiveRecordFrequencyRssi = () => {
    this.#stopCheckActiveRecordFrequencyRssi();

    this.#checkActiveRecordFrequencyRssiTimeout = setTimeout(this.#checkActiveRecordFrequencyRssi, 6000);
  };

  #stopCheckActiveRecordFrequencyRssi = () => {
    if (this.#checkActiveRecordFrequencyRssiTimeout != null) {
      clearTimeout(this.#checkActiveRecordFrequencyRssiTimeout);
      this.#checkActiveRecordFrequencyRssiTimeout = null;
    }
  };

  #checkActiveRecordFrequencyRssi = async () => {
    try {
      this.#stopCheckActiveRecordFrequencyRssi();
      const result = await this.#scanService.getActiveFrequency();

      console.log(`Check recording frequency: ${result.frequency}, with RSSI: ${result.rssiA}`);

      if (result.rssiA < config.scan.minRssiForStopSession) {
        await this.#frequencyRecordService.stopRecord(this.#activeFrequencyRecording);

        this.#activeFrequencyRecording = null;
        console.log(`Stopped recording frequency: ${result.frequency} with RSSI: ${result.rssiA}`);
        this.#scan();
      } else {
        this.#startCheckActiveRecordFrequencyRssi();
      }
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = { App };