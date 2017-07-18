<template>
	<div id="main-wrapper">
		<div class="left">
			<section id="input-data">
				<div id="meta-data">
					<div class="heading">Meta-Data</div>
					<div class="title">
						<label for="meta-text">Title</label>
						<input id="meta-text" type="text" v-model="metaData.title" autofocus/>
					</div>
					<div class="creators">
						<label>Creators</label>
						<div v-for="creator, key in metaData.creators" class="creator">
							<input type="text" v-model="metaData.creators[key]" :ref="'creator' + key">
							<div class="close" v-on:click="removeCreator(key)">✖</div>
						</div>
						<button type="button" v-on:click="addCreator"></button>
					</div>
				</div>
				<div id="text">
					<div class="heading">Texteditor</div>
					<input id="x" type="hidden" ref="editorText">
					<trix-editor class="editor-content" input="x"></trix-editor>
				</div>
			</section>
			<div id="generate">
				<button type="button" class="generate-button" v-on:click="generate">Generate ISCC</button>
			</div>
			<section id="result">
				<div class="heading">ISCC</div>
				<div class="id" id="metaID">Meta-ID
					<div class="value">{{ iscc.meta_id.code }}</div>
				</div>
				<div class="id" id="contentID">Content-ID
					<div class="value">{{ iscc.content_id.code }}</div>
				</div>
				<div class="id" id="dataID">Data-ID
					<div class="value">{{ iscc.data_id.code }}</div>
				</div>
				<div class="id" id="instanceID">Instance-ID
					<div class="value">{{ iscc.instance_id.code }}</div>
				</div>
			</section>
		</div>
		<div class="right">
			<section id="log">
				<div class="heading">Log</div>
				<div class="logEntries">
					<div v-for="entry, key in log" class="logEntry">
						<input type="checkbox" name="flip" :id="'entry' + key">
						<label class="flip" :for="'entry' + key"></label>
						<div class="date">{{ entry.time }}</div>
						<div class="iscc">{{ entry.iscc.meta_id.code }} - {{ entry.iscc.content_id.code }} - {{
							entry.iscc.data_id.code }} - {{ entry.iscc.instance_id.code }}
						</div>
						<div class="flipper">
							<div class="front">
								<div class="row">
									<div class="label" data-id="metaID">
										Meta-ID
									</div>
									<div class="bits" :data-sim="entry.sim.meta_id">
										<span v-for="bit, bitKey in entry.iscc.meta_id.bits" :class="{diff: entry.diff && !entry.diff.meta_id[bitKey]}">{{ bit }}</span>
									</div>
								</div>
								<div class="row">
									<div class="label" data-id="contentID">
										Content-ID
									</div>
									<div class="bits" :data-sim="entry.sim.content_id">
										<span v-for="bit, bitKey in entry.iscc.content_id.bits" :class="{diff: entry.diff && !entry.diff.content_id[bitKey]}">{{ bit }}</span>
									</div>
								</div>
								<div class="row">
									<div class="label" data-id="dataID">
										Data-ID
									</div>
									<div class="bits" :data-sim="entry.sim.data_id">
										<span v-for="bit, bitKey in entry.iscc.data_id.bits" :class="{diff: entry.diff && !entry.diff.data_id[bitKey]}">{{ bit }}</span>
									</div>
								</div>
								<div class="row">
									<div class="label" data-id="instanceID">
										Instance-ID
									</div>
									<div class="bits" :data-sim="entry.sim.instance_id">
										<span v-for="bit, bitKey in entry.iscc.instance_id.bits" :class="{diff: entry.diff && !entry.diff.instance_id[bitKey]}">{{ bit }}</span>
									</div>
								</div>
							</div>
							<div class="back">
								<div class="title">Title: {{ entry.title }}</div>
								<div v-if="entry.creators.length > 0" class="title">Creators: {{ entry.creators.join('; ') }}</div>
								<label class="text"><input type="checkbox">
									<div class="short" v-html="entry.text.substring(0, 100) + (entry.text.length > 100 ? '...' : '')"></div>
									<div class="long" v-html="entry.text"></div>
								</label>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>
<script>
import config from '../../config.js'
import trix from 'trix'
import Vue from 'vue'

export default{
	data: function() {
		return {
			iscc: {
				meta_id: {
					code: '-'
				},
				content_id: {
					code: '-'
				},
				data_id: {
					code: '-'
				},
				instance_id: {
					code: '-'
				}
			},
			metaData: {
				title: '',
				creators: []
			},
			text: '',
			log: []
		}
	},
	methods: {
		generate: function () {
			let that = this;
			let iscc = [];

			// to get the raw text we add the html to a tmp div and read the text
			let htmlText = this.$refs.editorText.value;
			let tmp = document.createElement('div');
			tmp.innerHTML = htmlText;
			let rawText = tmp.innerText;

			// get last logentry
			let lastBits = false;
			if (this.log.length > 0) {
				lastBits = this.log[this.log.length - 1];
			}

			this.$http.post(config.apiUrl + '/generate/meta_id', {
				'title': this.metaData.title,
				'creators': this.metaData.creators.join(';')
			}).then((response) => {
				iscc.meta_id = response.body.meta_id;

				this.$http.post(config.apiUrl + '/generate/content_id_text', {'text': rawText}).then((response) => {
					iscc.content_id = response.body.content_id;

					this.$http.post(config.apiUrl + '/generate/data_instance_id', htmlText || ' ', {
						headers: {
								'Content-Type': 'application/octet-stream'
						}
					}).then((response) => {
						iscc.data_id = response.body.data_id;
						iscc.instance_id = response.body.instance_id;

						let d = new Date();
						let timeStamp = d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate() + ' ' + d.toTimeString().substring(0, 8);

						let differences = false;
						let similarity = {
							meta_id: 100,
							content_id: 100,
							data_id: 100,
							instance_id: 100
						}
						if (lastBits) {
							differences = {
								meta_id: that.diffArray(iscc.meta_id.bits, lastBits.iscc.meta_id.bits),
								content_id: that.diffArray(iscc.content_id.bits, lastBits.iscc.content_id.bits),
								data_id: that.diffArray(iscc.data_id.bits, lastBits.iscc.data_id.bits),
								instance_id: that.diffArray(iscc.instance_id.bits, lastBits.iscc.instance_id.bits)
							};
							similarity = {
								meta_id: that.jaccard_sim(differences.meta_id),
								content_id: that.jaccard_sim(differences.content_id),
								data_id: that.jaccard_sim(differences.data_id),
								instance_id: that.jaccard_sim(differences.instance_id)
							};
						}

						that.iscc = iscc;
						that.log.push({
							iscc: iscc,
							time: timeStamp,
							title: that.metaData.title,
							creators: that.metaData.creators,
							text: htmlText,
							diff: differences,
							sim: similarity
						});
					})
				})
			})
		},
		addCreator: function () {
			this.metaData.creators.push('');
			var that = this;
			Vue.nextTick(function() {
				that.$refs['creator' + (that.metaData.creators.length - 1)][0].focus();
			})
		},
		removeCreator: function (key) {
			this.metaData.creators.splice(key, 1);
		},
		diffArray: function(arr1, arr2) {
			let diff = [];
			for (let i = 0; i < arr1.length; ++i) {
				diff.push(arr1[i] == arr2[i]);
			}
			return diff;
		},
		jaccard_sim: function(bool_array) {
			let true_count = bool_array.reduce(function (a, b) {
				return b ? a + 1 : a;
			}, 0);
			return Math.round(true_count / (2 * bool_array.length - true_count) * 100);
		}
	}
}

</script>
<style>
@import 'https://fonts.googleapis.com/css?family=Roboto';
@import '../../node_modules/trix/dist/trix.css';

* {
	box-sizing: border-box;
	vertical-align: top;
	margin: 0;
	padding: 0;
	border: none;
	color: inherit;
	font-family: roboto;
}

h1,h2,h3,h4,h5,h6 {
	padding: .2rem 0 .5rem 0;
}

p {
	padding: .5rem 0
}

ul, ol {
	padding: .5rem 0 .5rem 1.2rem;
}

hr {
	border-top: 1px solid #333;
	margin: .5rem 0;
}

button {
	cursor: pointer;
	background: #ccc;
}

body {
	font-family: 'Helvetica Neue', sans-serif;
	font-size: 16px;
	padding: .5rem;
}

[required].error {
	border: 1px red solid;
}

[draggable] {
	-moz-user-select: none;
	-webkit-user-select: none;
	user-select: none;
	-webkit-user-drag: element;
	cursor: move;
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

#main-wrapper {
	display: flex;
	flex-direction: column;
}

#input-data {
	display: flex;
	flex-flow: row wrap;
}

#meta-data {
	flex-basis: 100%;

	& .title {
		margin-bottom: 1rem;
	}

	& .title, & .creators {
		display: flex;
		align-items: center;
		background: #fff;
		overflow-x: auto;

		& label {
			width: 5rem;
			padding: .5rem;
			background-color: #ccc;
			margin: .5rem;
		}

		& input {
			padding: .5rem;
			flex: 1;
			background: #eee;
			margin: .5rem 0;
			margin-right: .5rem;
		}

		& .creator {
			position: relative;

			& input {
				padding: .5rem 1.6rem .5rem .5rem;
			}

			& .close {
				position: absolute;
				right: 1rem;
				top: 0.9rem;
				cursor: pointer;
				font-size: 0.8rem;
			}
		}

		& button {
			position: relative;
			flex-shrink: 0;
			width: 2rem;
			height: 2rem;
			margin-right: .5rem;
			background: #fff;
			font-size: 1.5rem;
		}
		& button:before {
			content: '+';
			font-size: 1.4rem;
			position: absolute;
			top: .5rem;
			left: .5rem;
			line-height: 1rem;
		}

	}
}

#text {
	flex-basis: 100%;
	display: flex;
	flex-direction: column;
	margin-top: 2rem;
	width: 100%;

	& .heading {
		flex: none;
	}

	& .editor-content {
		background-color: #fff;
		overflow-y: auto;
		max-height: 12rem;
	}
}

#trix-toolbar-1 {
	& .button_row {
		justify-content: flex-start;

		& .button_group {
			margin-right: 1rem;
		}
	}
	& button {
		background-color: #fff;
	}
	& button.active {
		background-color: #cbeefa;
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
		flex: 1;
		text-align: center;
		padding: .5rem;
		text-transform: capitalize;

		& .value {
			margin-top: 1rem;
			background: #fff;
			padding: 1rem;
			color: #000;
		}
	}
}

#generate {
	flex-basis: 100%;
	margin: 1rem;
	text-align: center;

	& .generate-button {
		background-color: #cc0000;
		color: #fff;
		padding: .5rem;
		font-size: 1.3rem;
	}

	& .generate-button:disabled {
		cursor: default;
		background: #eaeaea;
		color: #ccc;
	}
}

#log {
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
					height: 5.5rem;
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
						text-transform: uppercase;
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
			padding: .5rem;
			font-size: 0.9rem
		}
	}
}
</style>
