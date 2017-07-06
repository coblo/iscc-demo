'use strict';

var config;

try {

	config = require('./config.js');

} catch (error) {


	console.log('Please Provide config.js');
	console.log('1. make duplicate of config.default.js');
	console.log('2. name it config.js');
	console.log('3. remove /* */ surrounding "require(./config.default.js)"');
	console.log('4. adjust settings');

	console.log('Original Error:');

	console.log(error);

	process.exit(0);

}

const express = require('express');
const pug = require('pug');
const https = require('https');
const fs = require('fs');
const stylus = require('stylus');
const compression = require('compression');
const minify = require('express-minify');
const request = require('request-promise-native');

const app = express();

app.set('view engine', 'pug');
app.set('views', __dirname + '/source/templates/');

app.use(compression());
app.use(minify());

app.use(express.static(__dirname + '/static', {
	maxAge: 3600000 * 24 * 365
}));

const server = https.createServer({
	key: fs.readFileSync(config.sslKeyPath),
	cert: fs.readFileSync(config.sslCertificatePath),
	ca: fs.readFileSync(config.sslCaPath),
	ciphers: config.sslCiphers.join(':')
}, app);

const io = require('socket.io')(server);

let logEntries = [];

server.listen(config.port, () => {

	console.log('ISCC Demo running on port ' + config.port);

});

io.on('connection', socket => {

	socket.on('generate', data => {

		request.post({
			method: 'POST',
			uri: 'http://127.0.0.1:8000/generate/meta_id',
			form: {
				title: data.title,
				creators: data.creators
			},
			json: true
		}).then(metaResponse => {

			request.post({
				method: 'POST',
				uri: 'http://127.0.0.1:8000/generate/content_id_text',
				form: {
					text: data.text
				},
				json: true
			}).then(textResponse => {

				request.post({
					method: 'POST',
					uri: 'http://127.0.0.1:8000/generate/data_instance_id',
					body: data.html,
					headers: {
						'Content-Type': 'application/octet-stream'
					},
					json: true
				}).then(dataInstanceResponse => {

					let differences;
					if (logEntries.length > 0) {
						let lastBits = logEntries[logEntries.length - 1].iscc;
						differences = {
							meta_id: diffArray(metaResponse.meta_id.bits, lastBits.metaID.bits ),
							content_id: diffArray(textResponse.content_id.bits, lastBits.contentID.bits ),
							data_id: diffArray(dataInstanceResponse.data_id.bits, lastBits.dataID.bits ),
							instance_id: diffArray(dataInstanceResponse.instance_id.bits, lastBits.instanceID.bits )
						};
					}
					else
						differences = {
							meta_id: diffArray(metaResponse.meta_id.bits, metaResponse.meta_id.bits),
							content_id: diffArray(textResponse.content_id.bits, textResponse.content_id.bits),
							data_id: diffArray(dataInstanceResponse.data_id.bits, dataInstanceResponse.data_id.bits),
							instance_id: diffArray(dataInstanceResponse.instance_id.bits, dataInstanceResponse.instance_id.bits)
						};
					let similarity = {
						meta_id: jaccard_sim(differences.meta_id),
						content_id: jaccard_sim(differences.content_id),
						data_id: jaccard_sim(differences.data_id),
						instance_id: jaccard_sim(differences.instance_id)
					};
					let result = {
						metaID: {
							'code': metaResponse.meta_id.code,
							'bits': metaResponse.meta_id.bits,
							'diff': differences.meta_id,
							'sim': similarity.meta_id
						},
						contentID: {
							'code': textResponse.content_id.code,
							'bits': textResponse.content_id.bits,
							'diff': differences.content_id,
							'sim': similarity.content_id
						},
						dataID: {
							'code': dataInstanceResponse.data_id.code,
							'bits': dataInstanceResponse.data_id.bits,
							'diff': differences.data_id,
							'sim': similarity.data_id
						},
						instanceID: {
							'code': dataInstanceResponse.instance_id.code,
							'bits': dataInstanceResponse.instance_id.bits,
							'diff': differences.instance_id,
							'sim': similarity.instance_id
						}
					};

					let d = new Date();

					let timeStamp = d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' +
						(d.getDate() < 10 ? '0' : '') + d.getDate() + ' ' + d.toTimeString().substring(0, 8);

					let entry = {
						time: timeStamp,
						iscc: result,
						title: data.title,
						creator: data.creators,
						text: data.html
					};
					logEntries.push(entry);

					let html = pug.renderFile('source/templates/logentry.pug', {entry: entry});

					socket.emit('logchanged', html);
					socket.emit('generated', result);

				}).catch(error => {

					throw error;

				});

			});

		});

	});

});

app.get('/', function (req, res) {

	renderPage(res, 'main', {logEntries: logEntries});

});

function jaccard_sim(bool_array) {
	let true_count = bool_array.reduce(function(a,b){ return b?a+1:a; },0);
	return Math.round(true_count / (2 * bool_array.length - true_count) * 100);
}

function diffArray(arr1, arr2) {
	let diff = [];
	for (let i = 0; i < arr1.length; ++i) {
		diff.push(arr1[i] == arr2[i]);
	}
	return diff;
}

function renderStylus() {

	return new Promise((resolve, reject) => {

		fs.readFile('source/stylesheets/main.styl', 'utf8', (error, styleString) => {

			if (error)
				return reject(console.log(error));

			stylus(styleString).render((error, css) => {

				if (error)
					return reject(console.log(error));

				fs.writeFile('static/css/style.css', css, function (error) {

					if (error) {

						return reject(console.log(error));

					} else {

						resolve();

					}

				});

			});

		});

	});

}

function renderPage(res, template, data = {}) {

	renderStylus().then(() => {

		res.render(template, data);

	})

}