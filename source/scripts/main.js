'use strict';

var socket = io.connect();

var $creators = $('#bom .creators');
var $addCreator = $('#addCreator');
var $loadingBar = $('#loadingBar');
var $textarea = $('#text textarea');
var $generate = $('#generate .generate-button');
var $logEntries = $('#log .logEntries');

var texteditor = CKEDITOR.replace($textarea, {
	toolbar: [{
			name: 'clipboard',
			items: ['Undo', 'Redo']
		},
		{
			name: 'basicstyles',
			items: ['Bold', 'Italic', 'Strike', '-', 'RemoveFormat']
		},
		{
			name: 'paragraph',
			items: ['NumberedList', 'BulletedList', '-', 'Blockquote']
		},
		{
			name: 'styles',
			items: ['Styles', 'Format']
		}
	]
});

$addCreator.addEventListener('click', e => {

	addCreator();

});

$generate.addEventListener('click', () => {

	$loadingBar.classList.add('loading');
	$generate.disabled = true;

	$$('.title input, .creators input').forEach($element => {

		$element.addEventListener('input', () => {

			$generate.disabled = false;

		}, {
			once: true
		})

	});

	texteditor.on('change', () => {

		$generate.disabled = false;

	}, {
		once: true
	});

	let html = texteditor.getData();

	let tmp = document.createElement('div');
	tmp.innerHTML = html;

	let text = tmp.innerText;

	var data = {
		title: $('input[name="title"]').value,
		creators: $$('input[name="creator"]').map(input => {
			return input.value
		}).join(';'),
		html: html,
		text: text
	};

	if (logEntries.length)
		data.lastBits = logEntries[logEntries.length - 1].iscc;

	socket.emit('generate', data);

});

function addCreator() {

	$generate.disabled = false;

	var newInputWrap = document.createElement('div');
	newInputWrap.classList.add('creator');
	var newInput = document.createElement('input');
	newInput.type = 'text';
	newInput.name = 'creator';

	newInputWrap.appendChild(newInput);

	newInputWrap.addEventListener('click', e => {

		if (e.target.offsetWidth - e.offsetX < 25) {
			newInputWrap.remove();
		}

	});

	$creators.insertBefore(newInputWrap, $addCreator);

}

var logEntries = JSON.parse(localStorage.getItem('logEntries'));

if (logEntries && logEntries.length) {

	logEntries.forEach(addLogEntry);

} else {

	localStorage.setItem('logEntries', JSON.stringify([]));
	logEntries = JSON.parse(localStorage.getItem('logEntries'));

}

function addLogEntry(data) {

	let $newLogEntry = $(document.createElement('div'));
	$newLogEntry.classList.add('logEntry');

	$newLogEntry.innerHTML = $('#logEntryTemplate').innerHTML;

	$newLogEntry.find('input[name="flip"]').id = 'entry' + $logEntries.children.length;
	$newLogEntry.find('label.flip').setAttribute('for', 'entry' + $logEntries.children.length);

	$newLogEntry.find('.date').innerText = data.time;
	$newLogEntry.find('.iscc').innerText = Object.keys(data.iscc).map(key => {
		return data.iscc[key].code
	}).join(' - ');

	Object.keys(data.iscc).forEach(key => {

		let $label = $newLogEntry.find('.label[data-id="' + key + '"]');

		data.iscc[key].code.split('').forEach(codeChar => {
			$label.innerHTML += '<span>' + codeChar + '</span>';
		})

		let $bits = $label.nextElementSibling;

		$bits.dataset.sim = data.iscc[key].sim;

		for (let i = 0; i < data.iscc[key].bits.length; i++) {

			let span = document.createElement('span');

			span.innerText = data.iscc[key].bits[i];

			if (!data.iscc[key].diff[i])
				span.classList.add('diff');

			$bits.appendChild(span);

		}

	});

	$newLogEntry.find('.back .title').innerText = 'Title: ' + data.title;

	if (data.creator) {

		$newLogEntry.find('.back .creator').innerText = 'Creator: ' + data.creator;

	} else {

		$newLogEntry.find('.back .creator').remove();

	}

	$newLogEntry.find('.back .text .short').innerHTML = data.text.substring(0, 100) + (data.text.length > 100 ? '...' : '');
	$newLogEntry.find('.back .text .long').innerHTML = data.text;

	$logEntries.appendChild($newLogEntry);

}

socket.on('generated', data => {

	logEntries = JSON.parse(localStorage.getItem('logEntries'));

	logEntries.push(data.log);

	localStorage.setItem('logEntries', JSON.stringify(logEntries));

	addLogEntry(data.log);

	Object.keys(data.ids).forEach(id => {

		let classes = $('#' + id).classList;
		classes.remove('changed');

		let value_field = $('#' + id + ' .value');

		if (value_field.innerText != data.ids[id]['code'])
			classes.add('changed');

		value_field.innerText = data.ids[id]['code'];

		$$('#' + id + ' .bits .bit').forEach(function (value, key) {

			value.classList.remove('changed');

			if (value.innerText != data.ids[id]['bits'].charAt(key))
				value.classList.add('changed');

			value.innerText = data.ids[id]['bits'].charAt(key);

		})

	});

	$loadingBar.classList.remove('loading');

});