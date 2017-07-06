'use strict';

var socket = io.connect();

var $creators = $('#bom .creators');
var $addCreator = $('#addCreator');
var $loadingBar = $('#loadingBar');
var $textarea = $('#text textarea');

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


function sendData() {

	var $$invalids = $$('[required]:invalid');

	if ($$invalids.length) {

		$$invalids.forEach(input => {

			input.classList.add('error');

			input.addEventListener('keydown', () => {

				input.classList.remove('error');

			}, {
				once: true
			});

		});

	} else {

		$loadingBar.classList.add('loading');

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

		socket.emit('generate', data);

	}

}


let generateButton = $('#generate button');
generateButton.addEventListener('click', () => { sendData(); });

function addCreator() {

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

socket.on('generated', data => {

	Object.keys(data).forEach(id => {

		let classes = $('#' + id).classList;
		classes.remove('changed');
		let value_field = $('#' + id + ' .value');
		if (value_field.innerText != data[id]['code'])
			classes.add('changed');

		value_field.innerText = data[id]['code'];
		$$('#' + id + ' .bits .bit').forEach(function(value, key) {
			value.classList.remove('changed');
			if(value.innerText != data[id]['bits'].charAt(key))
				value.classList.add('changed');
			value.innerText = data[id]['bits'].charAt(key);
		})

	});

	$loadingBar.classList.remove('loading');

});

socket.on('logchanged', html => {
	let temp = document.createElement('div');
	temp.innerHTML = html;
	$('#log .log-entries').appendChild(temp.firstChild)
});