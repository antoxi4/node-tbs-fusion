const { TBSMessageType } = require('./Constants');

class TBSResponse {
  #data;

  /**
   * constructor description
   * @param  {{binaryResponse: Buffer}}
   */
  constructor({ binaryResponse = Buffer.alloc(0) }) {
    this.#data = binaryResponse;
  }

  get messageType() {
    return this.#data.readUInt8(5);
  }

  get tbsAddress() {
    return this.#data.readUInt8(4);
  }

  get messageData() {
    return this.#data.subarray(7);
  }

  get isAcknowledge() {
    return this.messageType === TBSMessageType.acknowledge;
  }

  get acknowledgeStatusCode() {
    return this.messageData.readUInt8(1)
  }

}

module.exports = { TBSResponse };