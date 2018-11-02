// imports
const msaMain = require("../msa-main")
const { join, relative, dirname } = require('path')
const { promisify } = require('util')
const fs = require('fs')
const mustache = require('mustache')
const glob = require('glob')

const globPrm = promisify(glob)
const readFilePrm = promisify(fs.readFile)

// init
var html
const init = async function(){
	// get dmg elems
	const files = await globPrm(join(__dirname, "static/mysimplegame/lib/*/drawmygame.json"))
	var descs = {}
	for(var file of files){
		var desc = await readFilePrm(file, 'utf8')
		desc = JSON.parse(desc)
		if(!Array.isArray(desc)) desc = [desc]
		for(var d of desc){
			d.dir = dirname(relative(join(__dirname, "static/mysimplegame/lib"), file))
			descs[d.key] = d
		}
	}
	// parse index.html template
	const template = await readFilePrm(join(__dirname, 'templates/index.html.tmpl'), "utf8")
	mustache.parse(template)
	html = mustache.render(template, {descs:JSON.stringify(descs)})
}
init()

const Dmg = class extends msaMain.constructor {

	initDefaultRouteMdw() {
		this.app.get('/', (req, res, next) => {
			res.setHeader('content-type', 'text/html')
			res.send(html)
		})
	}

	initEndMdws() {
		this.app.get('/refresh', async (req, res, next) => {
			await init()
			res.sendStatus(200)
		})
	}
}

module.exports = new Dmg()
