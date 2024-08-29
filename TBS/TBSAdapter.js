const { SerialPort } = require('serialport')

const { TBSResponseParser } = require('./TBSResponseParser');
const { TBSResponse } = require('./TBSResponse');
const { TBSRequest } = require('./TBSRequest');

const DefaultOptions = {
  address: 0,
  port: '/dev/ttyUSB0',
  baudRate: 9600,
  logging: false,
  rejectTimeoutInMs: 5000, // 5 seconds
};

class TBSAdapter {
  /** 
   * Serial Adapter instance
   * @type { SerialPort }
   */
  #devicePort;
  #deviceResponseParser;

  #port;
  #baudRate;
  #address;
  #rejectTimeoutInMs;

  /** 
   * Serial Adapter requests queue
   * @type { [TBSRequest] }
   */
  #requestsQueue = [];

  #logging = false;

  constructor({
    port = DefaultOptions.port,
    baudRate = DefaultOptions.baudRate,
    address = DefaultOptions.address,
    logging = DefaultOptions.logging,
    rejectTimeoutInMs = DefaultOptions.rejectTimeoutInMs,
  }) {
    this.#port = port;
    this.#baudRate = baudRate;
    this.#address = address;
    this.#logging = logging;
    this.#rejectTimeoutInMs = rejectTimeoutInMs;

    this.#deviceResponseParser = new TBSResponseParser();
    this.#devicePort = new SerialPort({
      path: this.#port,
      baudRate: this.#baudRate,
      stopBits: 1,
      dataBits: 8,
      parity: 'none',
    })

    this.#deviceResponseParser.onPacketReceived = this.#handleResponsePacket;
    this.#devicePort.on('data', this.#deviceResponseParser.onDataReceived);
  }

  /**
   * @return {Promise<TBSResponse>}
   */
  sendMessage = async (messageType, messageData) => {
    const messageRequest = new TBSRequest({
      requestTimeoutInMs: this.#rejectTimeoutInMs,
      messageType,
      messageData,
      tbsAddress: this.#address,
    });

    messageRequest.onRequestFullfilled = this.#onRequestComplete
    
    if (this.#requestsQueue.length) {
      this.#requestsQueue.push(messageRequest);
    } else {
      this.#requestsQueue.push(messageRequest);
      this.#makeNextRequest();
    }

    return messageRequest.promise;
  }

  #handleResponsePacket = async (data) => {
    const response = new TBSResponse({ binaryResponse: data });
    const [request] = this.#requestsQueue

    if (!request) {
      return;
    }

    if (response.tbsAddress !== this.#address) {
      console.warn('TBS response address does not match the adapter address');
      return;
    }

    this.#log('TBS RX data:', data);
    this.#log('TBS RX data length:', data.length);
    request.resolve(response);
  }

  #onRequestComplete = (requestId) => {
    this.#requestsQueue = this.#requestsQueue.filter((request) => request.id !== requestId);
    this.#makeNextRequest();
  }

  #makeNextRequest = () => {
    const [nextRequest] = this.#requestsQueue;

    if (!nextRequest) {
      return;
    }

    const message = nextRequest.tbsMessage

    this.#log('TBS TX data:', message);
    this.#log('TBS TX data length:', message.length);

    nextRequest.startRequestRejectionTimeout()
    this.#devicePort.write(message);
  }

  #log = (...message) => {
    if (this.#logging) {
      console.log(...message);
    }
  }
}

module.exports = { TBSAdapter };