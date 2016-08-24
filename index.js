#! /usr/bin/env node
const fetch = require("node-fetch");
const url = "http://qiita.com/api/v2/items/";
const item_id = process.argv[2];
const template = {
	ipynb: {
		"cells": null,
		"metadata": {
			"kernelspec": {
				"display_name": "Python 2",
				"language": "python",
				"name": "python2"
			},
			"language_info": {
				"codemirror_mode": {
					"name": "ipython",
					"version": 2
				},
				"file_extension": ".py",
				"mimetype": "text/x-python",
				"name": "python",
				"nbconvert_exporter": "python",
				"pygments_lexer": "ipython2",
				"version": "2.7.10"
			}
		},
		"nbformat": 4,
		"nbformat_minor": 1
	},
	markdownCell: {
		"cell_type": "markdown",
		"metadata": {},
		"source": null
	},
	codeCell: {
		"cell_type": "code",
		"execution_count": null,
		"metadata": {
			"collapsed": false
		},
		"outputs": [],
		"source": null
	}
};

fetch(url + item_id)
	.then(res => {
		return res.json();
	})
	.then(json => {
		const markdown = json.body;
		const ipynb = md2ipynb(markdown);

		console.log(JSON.stringify(ipynb, null, " "));
	})
	.catch(err => console.error(err));

/**
 *	@param {String} markdown
 *	@return {Object}
 */
function md2ipynb(markdown) {
	const lines = markdown.split("\n");
	const ipynb = Object.assign({}, template.ipynb);

	let isCodeBlock = false;
	let isMathBlock = false;
	let cell = Object.assign({}, template.markdownCell);

	ipynb.cells = [];
	cell.source = [];

	lines.forEach(line => {
		// starting line of code block
		if (line.match(/^```py/)) {
			ipynb.cells.push(cell);
			cell = Object.assign({}, template.codeCell);
			cell.source = [];
			isCodeBlock = true;
			isMathBlock = false;

		// ending line of code block
		} else if (isCodeBlock && line.match(/^```$/)) {
			// trim the last line break
			cell.source[cell.source.length - 1] = cell.source[cell.source.length - 1].replace(/\n$/, "");

			ipynb.cells.push(cell);
			cell = Object.assign({}, template.markdownCell);
			cell.source = [];
			isCodeBlock = false;
			isMathBlock = false;

		// inside code block
		} else if (isCodeBlock) {
			cell.source.push(line + "\n");

		// starting line of math block
		} else if (line.match(/^```math/)) {
			ipynb.cells.push(cell);
			cell = Object.assign({}, template.markdownCell);
			cell.source = [];
			isCodeBlock = false;
			isMathBlock = true;

		// ending line of math block
		} else if (isMathBlock && line.match(/^```$/)) {
			ipynb.cells.push(cell);
			cell = Object.assign({}, template.markdownCell);
			cell.source = [];
			isCodeBlock = false;
			isMathBlock = false;

		// inside math block
		} else if (isMathBlock) {
			cell.source.push("$$ " + line + " $$\n");

		// normal block
		} else {
			cell.source.push(line.replace(/^(#+)([^#^\s])/, "$1 $2") + "\n");
		}
	});

	ipynb.cells.push(cell);

	return ipynb;
}

exports.md2ipynb = md2ipynb;
