const { TBSAdapter } = require('./TBSAdapter');
const { TBSMessageType } = require('./Constants');

const RequestScanReceiver = {
  ab: 0,
  a: 1,
  b: 2,
}

class TBSService {
  /** 
    * TBS Adapter instance
    * @type { TBSAdapter }
    */
  #tbsAdapter;

  /**
     * constructor description
     * @param  {TBSAdapter} tbsAdapter - TBS Adapter instance
     */
  constructor(tbsAdapter) {
    this.#tbsAdapter = tbsAdapter;
  }

  /**
   * @return {Promise<Boolean>}
   */
  setFrequency = async (frequency) => {
    const isAllowedFrequency = this.#checkFrequency(frequency);

    if (!isAllowedFrequency) {
      throw new Error(`Invalid frequency ${frequency}, should be between 4900 and 6100`);
    }

    const requestData = Buffer.alloc(2);

    requestData.writeUInt16LE(frequency);

    const response = await this.#tbsAdapter.sendMessage(TBSMessageType.setFrequency, requestData);

    if (response.acknowledgeStatusCode !== 0) {
      throw new Error(`Failed to set frequency ${frequency} with status code: ${response.acknowledgeStatusCode}`);
    }

    return true;
  }

  /**
   * @return {Promise<{frequency: Number, rssiA: Number, rssiB: Number}>}
   */
  getCurrentFrequencyRSSI = async () => {
    const requestData = Buffer.alloc(0);
    const response = await this.#tbsAdapter.sendMessage(TBSMessageType.requestFreqAndRsi, requestData);
    const { messageData, isAcknowledge } = response;

    if (isAcknowledge) {
      throw new Error(`Failed to get frequency and RSSI with status code: ${response.acknowledgeStatusCode}`);
    }

    return {
      frequency: messageData.readUintLE(0, 2),
      rssiA: this.#convertRawRSSI(messageData.readUint8(2)),
      rssiB: this.#convertRawRSSI(messageData.readUint8(3)),
    };
  }

  scanFrequencyRange = async ({
    startFrequency = 4900,
    endFrequency = 6200,
    frequencyStep = 50,
    receiver = RequestScanReceiver.ab,
    frequencyChangeDelayInMs = 25,
  }) => {
    const isAllowedStartFrequency = this.#checkFrequency(startFrequency);
    const isAllowedEndFrequency = this.#checkFrequency(endFrequency);

    if (!isAllowedStartFrequency || !isAllowedEndFrequency) {
      throw new Error(`Invalid ${!isAllowedStartFrequency ? 'start' : 'end'} frequency, should be between 4900 and 6100`);
    }

    const frequencyDifference = Math.abs(endFrequency - startFrequency);
    const maxFrequencySteps = frequencyDifference / frequencyStep;

    if (maxFrequencySteps > 100) {
      throw new Error(`Max frequency steps should be 100, current steps ${maxFrequencySteps}`);
    }

    const requestData = Buffer.alloc(7);

    requestData.writeUInt16LE(startFrequency, 0);
    requestData.writeUInt16LE(endFrequency, 2);
    requestData.writeUInt8(frequencyStep, 4);
    requestData.writeUInt8(receiver, 5);
    requestData.writeUInt8(frequencyChangeDelayInMs, 6);

    const response = await this.#tbsAdapter.sendMessage(TBSMessageType.requestFreqRangeScan, requestData);

    if (response.isAcknowledge) {
      throw new Error(`Failed to scan frequency range with status code: ${response.acknowledgeStatusCode}`);
    }

    const frequencies = [];
    for (let i = 0; i < response.messageData.length; i += 1) {
      frequencies.push({
        frequency: startFrequency + (i * frequencyStep),
        rssi: this.#convertRawRSSI(response.messageData.readUInt8(i))
      });
    }

    return frequencies;
  }

  scanFrequencies = async ({
    receiver = RequestScanReceiver.ab,
    frequencyChangeDelayInMs = 40,
    frequencies = [4900, 6200],
  }) => {
    const hasOutOfRangeFrequency = frequencies.findIndex((frequency) => !this.#checkFrequency(frequency));

    if (hasOutOfRangeFrequency !== -1) {
      throw new Error(`Invalid frequency at index ${hasOutOfRangeFrequency}, should be between 4900 and 6100`);
    }

    if (frequencies.length > 100) {
      throw new Error('Max frequencies should be 100');
    }

    const bytesPerFrequency = 2;
    const requestData = Buffer.alloc(2 + frequencies.length * bytesPerFrequency);

    requestData.writeUInt8(receiver, 0);
    requestData.writeUInt8(frequencyChangeDelayInMs, 1);

    frequencies.forEach((frequency, index) => {
      requestData.writeUInt16LE(frequency, 2 + (index * bytesPerFrequency));
    });

    const response = await this.#tbsAdapter.sendMessage(TBSMessageType.requestFreqListScan, requestData);

    if (response.isAcknowledge) {
      throw new Error(`Failed to scan frequencies with status code: ${response.acknowledgeStatusCode}`);
    }

    const scannedFrequencies = [];
    for (let i = 0; i < response.messageData.length; i += 1) {
      scannedFrequencies.push({
        frequency: frequencies[i],
        rssi: this.#convertRawRSSI(response.messageData.readUInt8(i))
      });
    }

    return scannedFrequencies;
  }

  #convertRawRSSI = (rawRSSI) => {
    return Math.round(Number((rawRSSI / 255).toFixed(2)) * 100);
  }

  #checkFrequency = (frequency) => {
    return frequency >= 4900 && frequency <= 6200;
  };
}

module.exports = { TBSService, RequestScanReceiver };