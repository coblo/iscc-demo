'use strict';

import Vue from 'vue';
import VueResource from 'vue-resource';
Vue.use(VueResource);

import Main from '../vue/main.vue';
require('file-loader?name=build/[name].[ext]!../html/index.html');
require('file-loader?name=build/[name].[ext]!../html/dev-server.html');

document.addEventListener("DOMContentLoaded", function (event) {
	let vm = new Vue({
		el: '#iscc-demo',
		render: function (createElement) {
			return createElement(Main);
		}
	});
});