#! /usr/bin/env node
const fs = require("fs");
const url = require("url");
const fetch = require("node-fetch");
const baseUrl = "http://qiita.com/api/v2/items/";
const item_id = url.parse(process.argv[2]).pathname.split("/").pop();
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

const targetUrl = baseUrl + item_id;

console.info(`Fetching: ${targetUrl}`);

fetch(targetUrl)
	.then(res => {
		return res.json();
	})
	.then(json => {
		const title = json.title;
		const markdown = json.body;
		const ipynb = md2ipynb(markdown);
		const content = JSON.stringify(ipynb, null, " ");
		const filename = title + ".ipynb";

		// output to file
		fs.writeFile(filename, content, err => {
			if (err) {
				return console.error(err);
			}

			console.info(`Saved: ${filename}`);
		});
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
			if (!/^\\(?:begin|end)\{align\}/.test(line)) {
				cell.source.push("$$ " + line.replace(/^&\s*/, "") + " $$\n");
			}

		// normal block
		} else {
			cell.source.push(line.replace(/^(#+)([^#^\s])/, "$1 $2") + "\n");
		}
	});

	ipynb.cells.push(cell);

	return ipynb;
}

exports.md2ipynb = md2ipynb;
