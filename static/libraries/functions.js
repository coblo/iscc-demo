document.addEventListener('touchstart', function () { }, true);

var smartphoneMedia = window.matchMedia('(max-width: 767px)');
var smartphoneMediaWasActive = smartphoneMedia.matches;

var tabletMedia = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');
var tabletMediaWasActive = tabletMedia.matches;

var desktopMedia = window.matchMedia('(min-width: 1200px)');
var desktopMediaWasActive = desktopMedia.matches;

String.prototype.capitalize = function () {

	return this.replace(/(?:^|\s)\S/g, function (l) { return l.toUpperCase(); });

};

var rand = function (min, max) {

	return Math.floor(Math.random() * (max - min + 1) + min);

};

var randomSelect = function (arr) {

	return arr[Math.floor(Math.random() * arr.length)];

};

function $(prop) {

	if (typeof prop == 'object')
		var elem = prop;
	else
		var elem = document.querySelector(prop);

	if (!elem)
		return;

	elem.find = function (selector) {
		var found = elem.querySelector(selector);
		return !!found ? $(found) : null;
	}

	elem.findAll = function (multiSelector) {
		return Array.prototype.slice.call(elem.querySelectorAll(multiSelector));
	}

	return elem;
}

function $$(prop) {

	if (typeof prop == 'object')
		return Array.prototype.slice.call(prop);
	else
		return Array.prototype.slice.call(document.querySelectorAll(prop));

}
