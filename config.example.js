module.exports = {
  tbsFussion: {
    devicePath: '/dev/ttyUSB0',
    deviceBaudRate: 115200,
    deviceAddress: 1,
  },
  video: {
    capturingEnabled: true,
    devicePath: '/dev/video0',
  },
  output: {
    rootFolder: './output',
    dataFile: 'Records.json',
    videoFolder: 'video',
  },
  scan: {
    minRssiForStartSession: 50,
    minRssiForStopSession: 30,
    frequencyRange: {
      start: 4900,
      end: 6200,
    },
    frequencyStep: 10,
    frequenciesPerRequest: 40,
    maxTimeForRecordFrequencyInMs: 4000, // 4 seconds
  },
  server: {
    port: 3000,
  }
}