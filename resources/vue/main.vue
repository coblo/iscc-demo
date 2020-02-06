<template>
	<div>
		<h1>ISCC Web Demo v1.0.5</h1>
		<h2>Creating ISCC identifiers for media files and web pages.</h2>
		<div id="main-wrapper">
			<div class="left">
				<section id="input-data">
					<div class="heading">Content</div>
					<div id="radio-buttons">
						<label><input type="radio" v-model="generateFrom" value="file"> Generate from File</label>
						<label><input type="radio" v-model="generateFrom" value="url"> Generate from URL</label>
					</div>

					<div
						v-if="generateFrom === 'file'"
						id="drag-field"
						:class="{'file-dragged': localFileDragged}"
						@dragenter.prevent.stop="localFileDragged = true"
						@dragover.prevent.stop="localFileDragged = true"
						@dragleave.prevent.stop="localFileDragged = false"
						@drop.prevent.stop="localFileDropped"
					>
						<div v-if="fileStatus === 'missing'">
							You can drag a file here<br>or<br>use the button below
						</div>
						<div v-else-if="fileStatus === 'loading'">
							Uploading file...
						</div>
						<div v-else-if="fileStatus === 'generating'">
							Generating ISCC...
						</div>
						<div v-else class="file">{{ file }}</div>
					</div>

					<label v-if="generateFrom === 'file'" class="upload-button button">
						<span class="button">Upload file</span>
						<input type="file" @change="readFileData">
					</label>

					<form v-if="generateFrom === 'url'" class="from-url" @submit.prevent="generateISCCFromUrl">
						<label>
							URL:
							<input type="text" v-model="url">
						</label>
						<input type="submit" value="Generate From URL" class="button" />
					</form>

					<div v-if="showMetaData" class="heading">Meta-Data</div>
					<div id="meta-data" v-if="showMetaData">
						<div class="meta-data-wrapper">
							<div class="title">
								<label for="meta-text">
									Title
									<div class="help-wrapper">
										<img class="help-icon" src="../images/question.svg">
										<div class="help-text">
											The title of your content will be used to create the Meta-ID component of the final ISCC.<br>
											This is the only required field to create a valid Meta-ID component.<br>
											Similar title information will create Meta-IDs that are also similar.
										</div>
									</div>
								</label>
								<input id="meta-text" type="text" v-model="metaData.title" autofocus/>
							</div>

							<div class="extra">
								<label for="extra-text">
									Extra
									<div class="help-wrapper">
										<img class="help-icon" src="../images/question.svg">
										<div class="help-text">
											The extra of the content here.
										</div>
									</div>
								</label>
								<input id="extra-text" type="text" v-model="metaData.extra"/>
							</div>
						</div>
						<button type="button" class="generate-button" @click="generateMetaID">Regenerate Meta ID</button>
					</div>
				</section>

				<section id="result">
					<div class="heading">ISCC</div>
					<div class="id">
						<span>Meta-ID</span>
						<div class="help-wrapper">
							<img class="help-icon" src="../images/question.svg">
							<div class="help-text">Generated from Title and extra fields. Encodes similarity of Metadata.</div>
						</div>
						<div class="value">{{ iscc.meta_id.code }}</div>
					</div>
					<div class="id">
						<span>Content-ID</span>
						<div class="help-wrapper">
							<img class="help-icon" src="../images/question.svg">
							<div class="help-text">
								Generated from the extracted content (text, image, audio or viceo). Encodes structural content
								similarity.
							</div>
						</div>
						<div class="value">{{ iscc.content_id.code }}</div>
					</div>
					<div class="id">
						<span>Data-ID</span>
						<div class="help-wrapper">
							<img class="help-icon" src="../images/question.svg">
							<div class="help-text">Generated from the raw bitstream. Encodes raw data similarity.</div>
						</div>
						<div class="value">{{ iscc.data_id.code }}</div>
					</div>
					<div class="id">
						<span>Instance-ID</span>
						<div class="help-wrapper">
							<img class="help-icon" src="../images/question.svg">
							<div class="help-text">Generated from the raw bitstream. A checksum used for data integrity.</div>
						</div>
						<div class="value">{{ iscc.instance_id.code }}</div>
					</div>
				</section>

				<section id="matches" v-if="matches.length > 0">
					<div class="heading">
						Matches
						<div class="help-wrapper">
							<img class="help-icon" src="../images/question.svg">
							<div class="help-text">Matches from the content blockchain.</div>
						</div>
					</div>
					<div v-for="match in matches" class="match">
						<div class="date">
							<span>{{ formatDate(new Date(match.time)) }}</span>
							<span>
								Transaction:
								<a :href="'https://explorer.coblo.net/tx/' + match.txid">{{ match.txid }}</a>
							</span>
						</div>
						<div class="iscc">
							{{ match.iscc }}
						</div>
						<div class="front">
							<div class="row">
								<div class="label">
									Meta-ID
								</div>
								<div class="bits" :data-sim="jaccard_sim(match.diff[0])">
										<span v-for="(bit, bitKey) in match.bits[0]" :class="{diff: !match.diff[0][bitKey]}">{{ bit }}</span>
								</div>
							</div>
							<div class="row">
								<div class="label">
									Content-ID
								</div>
								<div class="bits" :data-sim="jaccard_sim(match.diff[1])">
									<span v-for="(bit, bitKey) in match.bits[1]" :class="{diff: !match.diff[1][bitKey]}">{{ bit }}</span>
								</div>
							</div>
							<div class="row">
								<div class="label">
									Data-ID
								</div>
								<div class="bits" :data-sim="jaccard_sim(match.diff[2])">
									<span v-for="(bit, bitKey) in match.bits[2]" :class="{diff: !match.diff[2][bitKey]}">{{ bit }}</span>
								</div>
							</div>
							<div class="row">
								<div class="label">
									Instance-ID
								</div>
								<div class="bits" :data-sim="jaccard_sim(match.diff[3])">
									<span v-for="(bit, bitKey) in match.bits[3]" :class="{diff: !match.diff[3][bitKey]}">{{ bit }}</span>
								</div>
							</div>
						</div>
						<div class="title">
							<span>Title:</span>
							<a v-if="match.content_url !== undefined" :href="match.content_url">{{ match.title }}</a>
							<span v-else>{{ match.title }}</span>
						</div>
					</div>
				</section>
			</div>

			<div class="right">
				<section id="log">
					<div class="heading">
						<div class="heading-text">
							<span>Log </span>
							<div class="help-wrapper">
								<img class="help-icon" src="../images/question.svg">
								<div class="help-text">
									Every time you generate an ISCC a new Log entry is created for you.<br>
									It shows the decoded raw bits of the ISCC one line per component.<br>
									If you generate a new ISCC the Log will also show which bits are
									affected by your change of data.
								</div>
							</div>
						</div>
						<button type="button" @click="clearLog" :disabled="log.length === 0">Clear Log</button>
					</div>
					<div class="logEntries">
						<div v-for="(entry, key) in log" class="logEntry">
							<input type="checkbox" name="flip" :id="'entry' + key">
							<label class="flip" :for="'entry' + key"></label>
							<div class="date">{{ entry.time }}</div>
							<div class="iscc">
								<span title="Meta-ID">{{ entry.iscc.meta_id.code }}</span> -
								<span title="Content-ID">{{ entry.iscc.content_id.code }}</span> -
								<span title="Data-ID">{{ entry.iscc.data_id.code }}</span> -
								<span title="Instance-ID">{{ entry.iscc.instance_id.code }}</span>
							</div>
							<div class="flipper">
								<div class="front">
									<div class="row">
										<div class="label">
											Meta-ID
										</div>
										<div class="bits" :data-sim="entry.sim.meta_id">
										<span v-for="(bit, bitKey) in entry.iscc.meta_id.bits"
											  :class="{diff: entry.diff && !entry.diff.meta_id[bitKey]}">{{ bit }}</span>
										</div>
									</div>
									<div class="row">
										<div class="label">
											Content-ID
										</div>
										<div class="bits" :data-sim="entry.sim.content_id">
										<span v-for="(bit, bitKey) in entry.iscc.content_id.bits"
											  :class="{diff: entry.diff && !entry.diff.content_id[bitKey]}">{{ bit }}</span>
										</div>
									</div>
									<div class="row">
										<div class="label">
											Data-ID
										</div>
										<div class="bits" :data-sim="entry.sim.data_id">
										<span v-for="(bit, bitKey) in entry.iscc.data_id.bits"
											  :class="{diff: entry.diff && !entry.diff.data_id[bitKey]}">{{ bit }}</span>
										</div>
									</div>
									<div class="row">
										<div class="label">
											Instance-ID
										</div>
										<div class="bits" :data-sim="entry.sim.instance_id">
										<span v-for="(bit, bitKey) in entry.iscc.instance_id.bits"
											  :class="{diff: entry.diff && !entry.diff.instance_id[bitKey]}">{{ bit }}</span>
										</div>
									</div>
								</div>
								<div class="back">
									<div class="title">Title: {{ entry.title }}</div>
									<div v-if="entry.extra" class="title">Extra: {{ entry.extra }}</div>
									<div v-if="entry.file !== null">File: {{ file }}</div>
									<div v-if="entry.url !== null">URL: {{ url }}</div>
									<div>Tophash: {{ entry.iscc.tophash }}</div>
									<div>GMT: {{ entry.iscc.gmt }}</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>

			<div v-if="error !== ''" class="error-text">Error:<br>{{ error }}</div>
		</div>
		<div id="footer">
			<span>
				This demo is work in progress. Its purpose is to give you an impression how the ISCC identifier works. Please feel free to give us
				<b><a href="https://content-blockchain.org/contact/">feedback</a></b>!
			</span>
			<br>
			<br>
			<a href="https://rightsprofiledemo.content-blockchain.org/" target="_blank">Rights Profile Demo</a> |
			<a href="https://github.com/coblo/iscc-demo" target="_blank">Source Code</a> | Copyright © 2017 - 2020 <a href="https://content-blockchain.org/" target="_blank">CBP</a>
		</div>
	</div>

</template>
<script>
import config from '../../config.js'

export default{
	data: function() {
		return {
			iscc: {
				meta_id: {
					code: '-',
					bits: 0
				},
				content_id: {
					code: '-',
					bits: 0
				},
				data_id: {
					code: '-',
					bits: 0
				},
				instance_id: {
					code: '-',
					bits: 0
				}
			},
			metaData: {
				title: '',
				extra: ''
			},
			text: '',
			log: [],
			entryDataChanged: false,
			localFileDragged: false,
			file: false,
			fileStatus: 'missing',
			generateFrom: 'file',
			url: '',
			showMetaData: false,
			error: '',
			matches: [],
		}
	},
	watch: {
		generateFrom(val) {
			this.file = false;
			this.fileStatus = 'missing';
			this.url = '';
			this.matches = [];
			this.metaData = {
				title: '',
				extra: ''
			};
			this.iscc = {
				meta_id: {
					code: '-',
					bits: 0
				},
				content_id: {
					code: '-',
					bits: 0
				},
				data_id: {
					code: '-',
					bits: 0
				},
				instance_id: {
					code: '-',
					bits: 0
				}
			};
			this.showMetaData = false;
		},
	},
	methods: {
		generateMetaID() {
			this.$http.post(config.apiUrl + '/generate/meta_id/', {
				title: this.metaData.title,
				extra: (this.metaData.extra ? this.metaData.extra : ' '),
			}).then(({body: {code, bits}}) => {
				this.iscc.meta_id.code = code;
				this.iscc.meta_id.bits = bits;

				this.pushToLog();
			}).catch(({body: {detail}}) => {
				this.showError(detail[0]['msg']);
			});
		},
		diffArray: function(arr1, arr2) {
			let diff = [];
			for (let i = 0; i < arr1.length; ++i) {
				diff.push(arr1[i] === arr2[i]);
			}
			return diff;
		},
		jaccard_sim: function(bool_array) {
			let true_count = bool_array.reduce(function (a, b) {
				return b ? a + 1 : a;
			}, 0);
			return Math.round(true_count / (2 * bool_array.length - true_count) * 100);
		},
		clearLog: function () {
			if (confirm('Really clear log?')) {
				this.log = [];
			}
		},
		localFileDropped($event) {
			this.localFileDragged = false;

			if (!$event.dataTransfer.files)
			{
				this.showError('Could not read file');
				return;
			}

			let file = $event.dataTransfer.files[0];

			if (!file)
			{
				this.showError('Could not read file');
				return;
			}

			// check if dragged file is folder (folder have no type, have no '.' in name and have size 0)
			if (file.type === '' && file.name.indexOf('.') === -1 && file.size === 0)
			{
				this.showError('Please select a file, not a folder');
				return;
			}

			this.fileStatus = 'loading';
			this.generateISCCFromFile(file);
		},
		readFileData($event) {
			if ($event.target.files && $event.target.files[0])
			{
				this.fileStatus = 'loading';
				this.generateISCCFromFile($event.target.files[0]);
			}
			else
			{
				this.showError('Could not read file');
			}
		},
		generateISCCFromFile(file) {
			this.fileStatus = 'generating';

			let formData = new FormData();
			formData.append('file', file);

			this.$http.post(config.apiUrl + '/generate/from_file', formData, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			}).then(({body: {iscc, tophash, gmt, bits, title, extra}}) => {
				let fileName = file.name.substr(0, file.name.lastIndexOf('.'));
				if (fileName === '')
					fileName = file.name;

				this.file = fileName;
				this.fileStatus = fileName;

				let isccParts = iscc.split('-');
				if (isccParts.length < 4)
				{
					this.iscc.content_id.code = isccParts[0];
					this.iscc.data_id.code = isccParts[1];
					this.iscc.instance_id.code = isccParts[2];
				}
				else
				{
					this.iscc.meta_id.code = isccParts[0];
					this.iscc.content_id.code = isccParts[1];
					this.iscc.data_id.code = isccParts[2];
					this.iscc.instance_id.code = isccParts[3];
				}

				if (bits.length < 4)
				{
					this.iscc.content_id.bits = bits[0];
					this.iscc.data_id.bits = bits[1];
					this.iscc.instance_id.bits = bits[2];
				}
				else
				{
					this.iscc.meta_id.bits = bits[0];
					this.iscc.content_id.bits = bits[1];
					this.iscc.data_id.bits = bits[2];
					this.iscc.instance_id.bits = bits[3];
				}

				this.iscc.tophash = tophash;
				this.iscc.gmt = gmt;

				this.metaData.title = title === undefined ? fileName : title;
				this.metaData.extra = extra === undefined ? '' : extra;

				if (bits.length < 4)
					this.generateMetaID();
				else
					this.pushToLog();
			}).catch(({body: {detail}}) => {
				if (typeof detail === 'object')
					this.showError(detail[0]['msg']);
				else
					this.showError(detail);

				this.fileStatus = 'missing';
			});
		},
		generateISCCFromUrl() {
			if (this.url === '')
			{
				this.showError('Please give a valid URL');
				return;
			}

			this.$http.post(config.apiUrl + '/generate/from_url?url=' + this.url).then(({body: {iscc, title, extra, tophash, gmt, bits}}) => {
				let isccParts = iscc.split('-');
				if (isccParts.length < 4)
				{
					this.iscc.content_id.code = isccParts[0];
					this.iscc.data_id.code = isccParts[1];
					this.iscc.instance_id.code = isccParts[2];
				}
				else
				{
					this.iscc.meta_id.code = isccParts[0];
					this.iscc.content_id.code = isccParts[1];
					this.iscc.data_id.code = isccParts[2];
					this.iscc.instance_id.code = isccParts[3];
				}

				if (bits.length < 4)
				{
					this.iscc.content_id.bits = bits[0];
					this.iscc.data_id.bits = bits[1];
					this.iscc.instance_id.bits = bits[2];
				}
				else
				{
					this.iscc.meta_id.bits = bits[0];
					this.iscc.content_id.bits = bits[1];
					this.iscc.data_id.bits = bits[2];
					this.iscc.instance_id.bits = bits[3];
				}

				this.iscc.tophash = tophash;
				this.iscc.gmt = gmt;

				this.metaData.title = title !== null ? title : this.url;
				this.metaData.extra = extra !== null ? extra : '';

				if (bits.length < 4)
					this.generateMetaID();
				else
					this.pushToLog();
			}).catch(({body: {detail}}) => {
				this.showError(detail[0]['msg']);
			});
		},
		formatDate(d) {
			return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate() + ' ' + d.toTimeString().substring(0, 8);
		},
		pushToLog() {
			this.matches = [];
			let isccString = [this.iscc.meta_id.code, this.iscc.content_id.code, this.iscc.data_id.code, this.iscc.instance_id.code].join('-');
			this.$http.get(config.apiUrl + '/lookup?iscc=' + isccString, {
				headers: {
					'Content-Type': 'application/json'
				}
			}).then(({body: matches}) => {
				for (let match of matches)
				{
					this.matches.push({
						iscc: match.keys.join('-'),
						bits: match.bits,
						diff: [
							this.diffArray(this.iscc.meta_id.bits, match.bits[0]),
							this.diffArray(this.iscc.content_id.bits, match.bits[1]),
							this.diffArray(this.iscc.data_id.bits, match.bits[2]),
							this.diffArray(this.iscc.instance_id.bits, match.bits[3]),
						],
						title: match.title,
						txid: match.txid,
						content_url: match.content_url,
						time: match.time,
						})
				}
			});

			this.showMetaData = true;

			let lastBits = false;
			if (this.log.length > 0) {
				lastBits = this.log[this.log.length - 1];
			}

			let differences = false;
			let similarity = {
				meta_id: 100,
				content_id: 100,
				data_id: 100,
				instance_id: 100
			};

			if (lastBits) {
				differences = {
					meta_id: this.diffArray(this.iscc.meta_id.bits, lastBits.iscc.meta_id.bits),
					content_id: this.diffArray(this.iscc.content_id.bits, lastBits.iscc.content_id.bits),
					data_id: this.diffArray(this.iscc.data_id.bits, lastBits.iscc.data_id.bits),
					instance_id: this.diffArray(this.iscc.instance_id.bits, lastBits.iscc.instance_id.bits)
				};
				similarity = {
					meta_id: this.jaccard_sim(differences.meta_id),
					content_id: this.jaccard_sim(differences.content_id),
					data_id: this.jaccard_sim(differences.data_id),
					instance_id: this.jaccard_sim(differences.instance_id)
				};
			}

			this.log.push({
				iscc: JSON.parse(JSON.stringify(this.iscc)),
				time: this.formatDate(new Date()),
				title: this.metaData.title,
				extra: this.metaData.extra,
				diff: differences,
				file: this.generateFrom === 'file' ? this.file : null,
				url: this.generateFrom === 'url' ? this.url : null,
				sim: similarity,
			});
		},
		showError(errorText) {
			this.error = errorText;
			setTimeout(() => { this.error = ''; }, 3000);
		},
	},
}


</script>
<style>
@import 'https://fonts.googleapis.com/css?family=Roboto';

html, body {
	padding: 0;
	margin: 0;
}

html {
	height: 100%;
}

body {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	font-size: 16px;
	padding: .5rem;

	& > div {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
}

* {
	box-sizing: border-box;
	vertical-align: top;
	margin: 0;
	padding: 0;
	border: none;
	font-family: roboto, sanserif, sans-serif;
}

h1, h2 {
	padding: .2rem 0 .5rem 0;
	margin-left: .5rem;
}

h1 {
	font-size: 24px;
}

h2 {
	font-size: 17px;
}

button, .button {
	cursor: pointer;
	background: #ccc;
	padding: 7px 15px;

	&:disabled {
		background-color: #eaeaea;
	}
}

#footer {
	padding: 2rem 5rem;

	& * {
		color: inherit;
	}

	& span {
		color: #3f51b5;
	}

	& a {
		text-decoration: none;
		font-weight: 600;
	}
}

section {
	padding: 1rem;
	margin: .5rem;
	background-color: #eee;

	& .heading {
		flex-basis: 100%;
		font-size: 1.3rem;
		margin-bottom: 1rem;
	}
}

.help-wrapper {
	position: relative;
	display: inline-block;

	& .help-icon {
		display: inline-block;
		width: 1rem;
		cursor: pointer;

		& + .help-text {
			display: none;
			position: absolute;
			width: 8rem;
			text-align: left;
			padding: 3px;
			border: 1px solid #444;
			background: #fff;
			border-radius: 6px;
			font-size: .8rem;
			bottom: 1.5rem;
			z-index: 2;
		}

		&:hover + .help-text {
			display: block;
		}
	}
}

#main-wrapper {
	flex: 1;
	display: flex;
	flex-direction: column;
}

#input-data {
	display: flex;
	flex-flow: row wrap;
}

#meta-data {
	width: 100%;
	display: flex;
	align-items: center;
	animation: 1s linear grow-meta;

	& .meta-data-wrapper {
		flex: 1;
	}

	& > button {
		margin-left: 1rem;
		font-size: 1rem;
	}

	& .title {
		margin-bottom: 1rem;
	}

	& .title, & .extra {
		display: flex;
		align-items: stretch;
		flex-flow: row wrap;
		background: #fff;
		padding: .5rem;

		& label {
			position: relative;
			width: 6.1rem;
			padding: .5rem;
			background-color: #ccc;
			margin-right: .5rem;
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}

		& input {
			padding: .5rem;
			flex: 1;
			background: #eee;
			margin-right: .5rem;
		}
	}
}

#result {
	flex-basis: 100%;
	display: flex;
	flex-flow: row wrap;
	align-content: flex-start;
	padding: .5rem;

	& .heading {
		padding: 1rem 1rem 0 1rem;
		flex-basis: auto;
	}

	& .id {
		position: relative;
		flex: 1;
		text-align: center;
		padding: .5rem 0;

		& .value {
			margin-top: 1rem;
			background: #fff;
			padding: 1rem;
			color: #000;
		}
	}
}

#log {
	& .heading {
		display: flex;
		justify-content: space-between;
		position: relative;

		& .help-text {
			left: 1rem;
			bottom: auto;
		}
	}

	& .logEntries {
		display: flex;
		flex-direction: column-reverse;
		overflow: auto;

		& .logEntry {
			display: flex;
			flex-flow: row wrap;
			margin-top: 1rem;
			padding: 1rem;
			background-color: #fff;
			position: relative;
			animation: 1s linear grow;
			overflow-y: hidden;

				& .date, & .iscc {
					flex-basis: 100%;
					margin-bottom: .5rem;
				}

				& .date {
					font-size: .7rem;
				}

				& .flip {
					position: absolute;
					top: 1rem;
					right: 1rem;
					border: 2px solid black;
					border-radius: 100%;
					width: 1.5rem;
					height: 1.5rem;
					font-weight: bold;
				}

				& .flip:before {
					left: .5rem;
					top: .08rem;
					position: absolute;
					content: 'i';
				}

				& input {
					display: none;
				}

				& .flipper {
					transition: 0.6s;
					transform-style: preserve-3d;
					position: relative;
					width: 100%;

					& .front, & .back {
						backface-visibility: hidden;
					}
					& .front {
						z-index: 2;
						display: block;
						transform: rotateY(0deg);
					}
					& .back {
						display: none;
						transform: rotateY(180deg);
					}
				}

				& input:checked {
					& ~ .flip:before {
						left: .39rem;
						top: -.05rem;
						content: 'x';
					}

					& ~ .flipper {
						transform: rotateY(180deg);
						& .front {
							z-index: 2;
							display: none;
						}
						& .back {
							display: block;
						}
					}
				}

				& .front, & .back {
					width: 100%;
					height: 6.5rem;
					overflow-y: auto;
				}

				& .front {
					flex-direction: column;

					& .row {
						display: flex;
						align-items: center;
					}
					& .row:not(:last-of-type) {
						margin-bottom: .5rem;
					}

					& .label {
						width: 7rem;
						font-size: .7rem;
						text-align: right;
						padding-right: .5rem;
					}

					& .bits {
						position: relative;
						cursor: default;
					}

					& .bits:hover:before {
							opacity: 1;
					}

					& .bits:before {
						content: 'Jaccard-Similarity: ' attr(data-sim) '%';
						position: absolute;
						left: 0;
						top: -2px;
						bottom: -2px;
						width: 100%;
						color: #000;
						background-color: rgba(255,255,255,.5);
						font-weight: bold;
						text-align: center;
						font-size: .8rem;
						line-height: 1.2rem;
						opacity: 0;
					}

					& span {
						background-color: #1EB025;
						color: rgba(255, 255, 255, 0.5);
						font-family: "roboto mono", monospace;
						font-size: .8rem;
						padding: 2px 0;
					}

					& span.diff {
						background-color: #FF0000;
					}
				}

			& .back {
				& .text input {
					display: none;

					& ~ .short {
						display: block;
					}

					& ~ .long {
						display: none;
					}
				}

				& .text input:checked {
					& ~ .short {
						display: none;
					}
					& ~ .long {
						display: block;
					}
				}
			}
		}
	}
}

#drag-field {
	background: #fff;
	text-align: center;
	line-height: 2rem;
	position: relative;
	width: 100%;
	height: 160px;
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: space-around;
	margin-bottom: 1rem;

	&.file-dragged:before {
		content: '';
		position: absolute;
		left: 5px;
		right: 5px;
		top: 5px;
		bottom: 5px;
		border: 2px dashed lightblue;
	}
}

.upload-button {
	margin-left: 50%;
	transform: translateX(-50%);
	margin-bottom: 1rem;
}

input[type="file"] {
	display: none;
}

.from-url {
	width: 100%;
	display: flex;
	margin-bottom: 2rem;

	& label {
		display: inline-flex;
		align-items: center;
		flex: 1;

		& input[type="text"] {
			padding: 7px 15px;
			margin: 0 1rem;
			flex: 1;
		}
	}
}

#radio-buttons {
	display: flex;
	margin-bottom: 1rem;

	& > label {
		display: flex;
		align-items: center;
		margin-right: 1rem;

		& input {
			margin-right: 5px;
		}
	}
}

#matches {
	& .match {
		display: flex;
		flex-flow: row wrap;
		margin-top: 1rem;
		padding: 1rem;
		background-color: #fff;
		position: relative;
		animation: 1s linear grow;
		overflow-y: hidden;

		& .date, & .iscc {
			flex-basis: 100%;
			margin-bottom: .5rem;
		}

		& .date {
			font-size: .7rem;
			display: flex;
			justify-content: space-between;
		}

		& .front {
			width: 100%;
			height: 6.5rem;
			overflow-y: auto;
		}

		& .front {
			flex-direction: column;

			& .row {
				display: flex;
				align-items: center;

				&:not(:last-of-type) {
					margin-bottom: .5rem;
				}
			}

			& .label {
				width: 7rem;
				font-size: .7rem;
				text-align: right;
				padding-right: .5rem;
			}

			& .bits {
				position: relative;
				cursor: default;
			}

			& .bits:hover:before {
				opacity: 1;
			}

			& .bits:before {
				content: 'Jaccard-Similarity: ' attr(data-sim) '%';
				position: absolute;
				left: 0;
				top: -2px;
				bottom: -2px;
				width: 100%;
				color: #000;
				background-color: rgba(255,255,255,.5);
				font-weight: bold;
				text-align: center;
				font-size: .8rem;
				line-height: 1.2rem;
				opacity: 0;
			}

			& span {
				background-color: #1EB025;
				color: rgba(255, 255, 255, 0.5);
				font-family: "roboto mono", monospace;
				font-size: .8rem;
				padding: 2px 0;
			}

			& span.diff {
				background-color: #FF0000;
			}
		}

		& .title {
			font-size: .8rem;
			display: flex;
			width: 100%;
			margin-top: 10px;

			& :first-child {
				white-space: nowrap;
				margin-right: 5px;
			}
		}
	}
}

@media (min-width: 1200px) {
	#main-wrapper {
		flex-direction: row;

		& .left {
			flex-basis: 50%;
			width: 50%;
		}

		& .right {
			flex-basis: 50%;
			width: 50%;
		}
	}

	#result {
		& .heading {
			margin-bottom: 1.25rem;
			margin-top: auto;
		}
		& .id {
			font-size: 0.9rem
		}
	}
}

@media (max-width: 750px) {
	body {
		padding: 0;
	}
	section {
		margin: 0;
	}
	#result {
		& .heading {
			flex-basis: 100%;
		}
		& .id {
			flex-basis: 100%;
			text-align: start;
			& span {
				margin-left: 1rem;
			}

			& .value {
				display: inline;
				margin: 0;
				float: right;
				width: 50%;
				text-align: center;
				padding: .5rem;
			}
		}
	}
	#log {
		& .logEntries {
			& .logEntry {
				& .front {
					& .label {
						white-space: nowrap;
						width: 4rem;
					}
					& .bits {
						width: calc(100% - 4rem);
						& span {
							font-size: 0.7rem;
						}
					}
				}
			}
		}
	}
}

	.error-text {
		position: fixed;
		top: 1rem;
		right: 1rem;
		padding: 10px;
		background: red;
		color: #fff;
	}

@keyframes grow {
	from { max-height: 0; padding: 0 1rem; }
	to   { max-height: 200px; padding: 1rem; }
}

@keyframes grow-meta {
	from { max-height: 0; overflow: hidden; }
	to   { max-height: 200px; overflow: hidden; }
}
</style>
