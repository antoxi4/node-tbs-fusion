
const config = require('./config')

const Koa = require('koa')
const Router = require('koa-router')
const { createServer } = require('http')

const { MainController } = require('./Controllers/MainController')

class App {
  koaServer
  httpServer

  commonRouter
  mainController

  constructor() {
    this.commonRouter = new Router({ prefix: '/api' })
    this.mainController = new MainController()

    this.koaServer = new Koa()
    this.httpServer = createServer(this.koaServer.callback())
  }

  main = async () => {
    this.#configureRoutes()
    this.#startServer()
  };

  #configureRoutes = () => {
    this.commonRouter.use(this.mainController.routes())
    this.commonRouter.use(this.mainController.allowedMethods())

    this.koaServer.use(this.commonRouter.routes())
    this.koaServer.use(this.commonRouter.allowedMethods())
  }

  #startServer = () => {
    this.httpServer.listen(config.server.port, () => {
      console.log(`Server listening on port ${config.server.port}`)
    })
  }
}

module.exports = { App };