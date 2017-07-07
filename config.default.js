module.exports = Object.assign( /* require('./config.default.js') , */ {
	port: 5555,
	apiAddress: "http://127.0.0.1:8000",
	sslKeyPath: "ssl/demo-key.pem",
	sslCertificatePath: "ssl/demo-crt.pem",
	sslCaPath: "ssl/demo-ca-crt.crt",
	sslCiphers: [
		"ECDHE-RSA-AES256-SHA384",
		"DHE-RSA-AES256-SHA384",
		"ECDHE-RSA-AES256-SHA256",
		"DHE-RSA-AES256-SHA256",
		"ECDHE-RSA-AES128-SHA256",
		"DHE-RSA-AES128-SHA256",
		"HIGH",
		"!aNULL",
		"!eNULL",
		"!EXPORT",
		"!DES",
		"!RC4",
		"!MD5",
		"!PSK",
		"!SRP",
		"!CAMELLIA"
	]
});