const TBSHeaderStartCode = new Uint8Array([0xAA, 0x55]);

const TBSMessageType = {
  acknowledge: 0,
  requestFreqAndRsi: 1,
  responseFreqAndRsi: 2,
  setFrequency: 3,
  requestFreqRangeScan: 4,
  requestFreqListScan: 5,
  responseFreqScan: 6,
};

const TBSMessageResponseType = {
  [TBSMessageType.setFrequency]: TBSMessageType.acknowledge,
  [TBSMessageType.requestFreqAndRsi]: TBSMessageType.responseFreqAndRsi,
  [TBSMessageType.requestFreqRangeScan]: TBSMessageType.responseFreqScan,
  [TBSMessageType.requestFreqListScan]: TBSMessageType.responseFreqScan,
};

module.exports = {
  TBSHeaderStartCode,
  TBSMessageType,
  TBSMessageResponseType,
};