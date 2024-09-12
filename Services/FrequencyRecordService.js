const fs = require('fs');
const path = require('path');
const FfmpegCommand = require('fluent-ffmpeg');

const config = require('../config')

class Record {
  /**
   * @type {string}
   */
  recordId;
  /**
   * @type {number}
   */
  frequency;
  /**
   * @type {number}
   */
  startTime;
  /**
   * @type {number | null}
   */
  endTime;
  /**
   * @type {string}
   */
  videoPath;
  /**
   * @type {FfmpegCommand}
   */
  ffmpegSession;

  constructor({ recordId, frequency, startTime, endTime, videoPath, ffmpegSession }) {
    this.recordId = recordId;
    this.frequency = frequency;
    this.startTime = startTime;
    this.endTime = endTime;
    this.videoPath = videoPath;
    this.ffmpegSession = ffmpegSession;
  }
}

class FrequencyRecordService {
  #outputFolderPath;
  #videoFolderPath;
  #recordsFilePath;

  constructor() {
    this.#outputFolderPath = path.resolve(config.output.rootFolder);
    this.#videoFolderPath = path.join(this.#outputFolderPath, config.output.videoFolder);
    this.#recordsFilePath = path.join(this.#outputFolderPath, config.output.dataFile);

    this.#createRootFolderIfNotExists();
  }

  /**
   * @param  {number} frequency
   */
  startRecord = async (frequency) => {
    const recordId = Date.now();
    const data = this.#getDataFile();
    const record = new Record({
      recordId,
      frequency,
      startTime: recordId,
      endTime: null,
      videoPath: path.join(this.#videoFolderPath, `${recordId}.avi`),
      ffmpegSession: new FfmpegCommand()
    });

    data.push({
      recordId: record.recordId,
      frequency: record.frequency,
      startTime: record.startTime,
      endTime: record.endTime,
      videoPath: record.videoPath,
    });

    this.#storeDataFile(data);

    return config.video.capturingEnabled ? this.#startRecordVideo(record) : record;
  };

  /**
   * @param  {Record} record
   */
  stopRecord = async (record) => {
    const data = this.#getDataFile();
    const foundRecord = data.find((storedRecord) => storedRecord.recordId === record.recordId);

    if (foundRecord) {
      record.endTime = Date.now();
      foundRecord.endTime = record.endTime;
    }

    this.#storeDataFile(data);

    return this.#stopRecordVideo(record);
  };

  /**
   * @param  {Record} record
   */
  #startRecordVideo = async (record) => {
    return new Promise((resolve, reject) => {
      record.ffmpegSession
        .input(config.video.devicePath)
        .save(record.videoPath)
        .on('start', () => {
          resolve(record);
        })
        .on('error', (err, stdout, stderr) => {
          reject(err);
        });
    });
  };

  /**
   * @param  {Record} record
   */
  #stopRecordVideo = async (record) => {
    return new Promise((resolve, reject) => {
      record.ffmpegSession.on('end', () => {
        resolve();
      })

      try {
        record.ffmpegSession.ffmpegProc.stdin.write('q');
      } catch (error) {
        reject(error);
      }
    }).finally(() => {
      record.ffmpegSession = null;
    });
  };

  #createRootFolderIfNotExists = () => {
    if (!fs.existsSync(this.#outputFolderPath)) {
      fs.mkdirSync(this.#outputFolderPath);
      fs.mkdirSync(this.#videoFolderPath);
      fs.writeFileSync(path.join(this.#outputFolderPath, config.output.dataFile), JSON.stringify([]));
    }
  };

  /**
   * @return {{recordId: number, frequency: number, startTime: number, endTime: number | null, videoPath: string}[]}
   */
  #getDataFile = () => {
    return JSON.parse(fs.readFileSync(this.#recordsFilePath));
  };

  #storeDataFile = (data) => {
    fs.writeFileSync(this.#recordsFilePath, JSON.stringify(data));
  };
}

module.exports = { FrequencyRecordService, Record };