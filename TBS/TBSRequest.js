const { v4: uuidv4 } = require('uuid');
const { crc16 } = require('easy-crc');
const { TBSHeaderStartCode, TBSMessageType } = require('./Constants');

class TBSRequest {
  #tbsAddress;
  #messageType;
  #messageData;

  #requestId;
  #requestPromise;
  #requestPromiseResolve;
  #requestPromiseReject;

  #requestTimeout = null;
  #requestTimeoutInMs;

  onRequestFullfilled = () => { };

  /**
   * constructor description
   * @param  {{tbsAddress: number, messageType: TBSMessageType, messageData: Buffer, requestTimeoutInMs: number}}
   */
  constructor({ tbsAddress, messageType, messageData, requestTimeoutInMs }) {
    this.#requestId = uuidv4();
    this.#tbsAddress = tbsAddress;
    this.#messageType = messageType;
    this.#messageData = messageData;
    this.#requestTimeoutInMs = requestTimeoutInMs;

    this.#requestPromise = new Promise((resolve, reject) => {
      this.#requestPromiseResolve = resolve;
      this.#requestPromiseReject = reject;
    }).finally(this.#onPromiseFullfilled);
  }

  get id() {
    return this.#requestId;
  }

  get promise() {
    return this.#requestPromise;
  }

  get resolve() {
    return this.#requestPromiseResolve;
  }

  get reject() {
    return this.#requestPromiseReject;
  }

  get requestHeader() {
    const HEADER_START_CODE = TBSHeaderStartCode;
    const HEADER_ADDRESS = new Uint8Array([this.#tbsAddress]);
    const HEADER_MSG_TYPE = new Uint8Array([this.#messageType]);
    const HEADER_DATA_LENGTH = new Uint8Array([this.#messageData.length]);

    const checksumBuffer = new Uint8Array([...HEADER_ADDRESS, ...HEADER_MSG_TYPE, ...HEADER_DATA_LENGTH, ...this.#messageData]).buffer
    const checksum = crc16('CCITT-FALSE', checksumBuffer);
    const HEADER_CRC = Buffer.alloc(2);

    HEADER_CRC.writeUInt16LE(checksum);

    const combinedHeader = new Uint8Array([
      ...HEADER_START_CODE,
      ...HEADER_CRC,
      ...HEADER_ADDRESS,
      ...HEADER_MSG_TYPE,
      ...HEADER_DATA_LENGTH,
    ]);

    return combinedHeader;
  }

  get tbsMessage() {
    const header = this.requestHeader;
    const txData = Buffer.alloc(header.length + this.#messageData.length);

    txData.set(header, 0);
    txData.set(this.#messageData, header.length);

    return txData
  }

  startRequestRejectionTimeout = () => {
    this.#requestTimeout = setTimeout(this.#rejectByTimeout, this.#requestTimeoutInMs);
  }

  #rejectByTimeout = () => {
    clearTimeout(this.#requestTimeout);
    this.#requestTimeout = null;

    this.#requestPromiseReject(new Error(`Request timeout for response ${this.#messageType}`));
  }

  #onPromiseFullfilled = (result) => {
    clearTimeout(this.#requestTimeout);
    this.#requestTimeout = null;
    this.onRequestFullfilled(this.#requestId);

    return result;
  }
}

module.exports = { TBSRequest };