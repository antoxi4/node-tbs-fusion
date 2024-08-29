const { TBSHeaderStartCode } = require('./Constants');

class TBSResponseParser {
  onPacketReceived = null;

  #temporaryResponsePacket = null;
  #temporaryResponsePacketLength = null;

  onDataReceived = (data) => {
    const tempData = this.#temporaryResponsePacket ? Buffer.concat([this.#temporaryResponsePacket, data]) : data;

    if (this.#temporaryResponsePacketLength == null && tempData.length >= 7) {
      const messageDataLength = tempData.readUInt8(6);

      this.#temporaryResponsePacketLength = messageDataLength + 7;
    }

    if (this.#temporaryResponsePacketLength != null && tempData.length >= this.#temporaryResponsePacketLength && this.#isCorrectStartCode(tempData)) {
      const collectedPacket = tempData.subarray(0, this.#temporaryResponsePacketLength);

      this.#onPacketParsed(collectedPacket);

      this.#temporaryResponsePacket = null;
      this.#temporaryResponsePacketLength = null

      if (tempData.length > collectedPacket.length) {
        this.onDataReceived(tempData.subarray(collectedPacket.length));
      }
      return
    }

    this.#temporaryResponsePacket = tempData;
  }

  #onPacketParsed = (data) => {
    if (this.onPacketReceived) {
      this.onPacketReceived(data);
    }
  }

  #isCorrectStartCode = (data) => {
    const [initialFirstBite, initialSecondByte] = TBSHeaderStartCode;

    return data[0] === initialFirstBite && data[1] === initialSecondByte;
  }
}

module.exports = { TBSResponseParser };