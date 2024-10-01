const Router = require('koa-router')
const koaBody = require('koa-body');

const config = require('../config');
const { TBSAdapter, TBSService, RequestScanReceiver } = require('../TBS');
const { FrequencyRecordService, Record } = require('../Services/FrequencyRecordService');


class MainController extends Router {
  /**
   * @type {Record | null}
   */
  #activeFrequencyRecording;
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
  #frequencyRecordService;

  constructor() {
    super();

    this.#tbsAdapter = new TBSAdapter({
      address: config.tbsFussion.deviceAddress,
      baudRate: config.tbsFussion.deviceBaudRate,
      port: config.tbsFussion.devicePath,
      rejectTimeoutInMs: 50000,
      logging: false,
    });
    this.#tbsService = new TBSService(this.#tbsAdapter);
    this.#frequencyRecordService = new FrequencyRecordService();

    this.get('/frequency/active', this.getActiveFrequency);
    this.patch('/frequency/active', koaBody.koaBody(), this.setActiveFrequency);
    this.post('/frequency/scan', koaBody.koaBody(), this.scanFrequencies);

    this.post('/frequency/capture/start', koaBody.koaBody(), this.startCapturing);
    this.post('/frequency/capture/stop', this.stopCapturing);
  }

  getActiveFrequency = async (ctx) => {
    try {
      const result = await this.#tbsService.getCurrentFrequencyRSSI();

      ctx.body = result;
      ctx.status = 200;
    } catch (error) {
      ctx.throw(500, error.message)
    }
  }

  setActiveFrequency = async (ctx) => {
    try {
      const { frequency } = ctx.request.body;

      await this.#tbsService.setFrequency(frequency);

      ctx.status = 200;
    } catch (error) {
      ctx.throw(500, error.message)
    }
  }

  scanFrequencies = async (ctx) => {
    try {
      const { receiver, frequencyChangeDelayInMs, frequencies } = ctx.request.body;
      const result = await this.#tbsService.scanFrequencies({
        receiver: RequestScanReceiver[receiver],
        frequencyChangeDelayInMs,
        frequencies,
      })

      ctx.body = result;
      ctx.status = 200;
    } catch (error) {
      ctx.throw(500, error.message)
    }
  }

  startCapturing = async (ctx) => {
    try {
      const { frequency } = ctx.request.body;
      const previousRecordingFrequency = this.#activeFrequencyRecording?.frequency;

      if (this.#activeFrequencyRecording) {
        await this.#frequencyRecordService.stopRecord(this.#activeFrequencyRecording);
        this.#activeFrequencyRecording = null;
      }

      await this.#tbsService.setFrequency(frequency);
      this.#activeFrequencyRecording = await this.#frequencyRecordService.startRecord(frequency);

      ctx.body = { 
        startedCapturing: frequency,
        previousRecordingFrequency,
      };
      ctx.status = 200;
    } catch (error) {
      ctx.throw(500, error.message)
    }
  }

  stopCapturing = async (ctx) => {
    try {
      if (this.#activeFrequencyRecording) {
        await this.#frequencyRecordService.stopRecord(this.#activeFrequencyRecording);
        this.#activeFrequencyRecording = null;
      }

      ctx.body = {};
      ctx.status = 200;
    } catch (error) {
      ctx.throw(500, error.message)
    }
  }
}

module.exports = { MainController };