module.exports = {
  tbsFussion: {
    devicePath: '/dev/ttyUSB0',
    deviceBaudRate: 9600,
    deviceAddress: 1,
  },
  video: {
    devicePath: '/dev/video0'
  },
  output: {
    dataFile: 'output/DB.json',
    videoFolder: 'output/video',
  },
  scan: {
    frequencyRange: {
      start: 4900,
      end: 6200,
    },
    frequencyStep: 10,
    frequenciesPerRequest: 40,
  }
}