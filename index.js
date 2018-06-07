var dmg = module.exports = Msa.module("")

const msaMain = require("../msa-main")

// import some middlewares
dmg.app.use(Msa.bodyParser.text())
dmg.app.use(Msa.bodyParser.json())
dmg.app.use(Msa.bodyParser.urlencoded({extended:false}))

dmg.app.use(Msa.modulesRouter)

dmg.app.get('*', msaMain.get)
